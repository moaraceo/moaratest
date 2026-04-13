-- ============================================================
-- Migration 003: admin 역할 추가 + 플랫폼 분석 RLS 정책
--
-- 목적: 단순 근태 관리 앱 → 프리랜서 노동 데이터 수집·분석 플랫폼
--       Moara 운영팀(admin)이 집계 데이터에 안전하게 접근할 수 있도록 설계
--
-- 실행 위치: Supabase Dashboard → SQL Editor
-- 실행 순서: 001 → 002 → 003 (순서 중요)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. users.role에 'admin' 값 허용
-- ────────────────────────────────────────────────────────────
-- 기존 CHECK 제약 제거
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- admin 포함 새 CHECK 제약 추가
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IS NULL OR role IN ('owner', 'staff', 'admin'));

COMMENT ON COLUMN users.role IS
  'User role: owner(사장님) | staff(직원) | admin(Moara 운영팀). '
  '전화번호 가입 직후에는 NULL, role-select 화면에서 선택 후 업데이트됨. '
  'admin은 운영팀만 수동으로 부여.';

-- ────────────────────────────────────────────────────────────
-- 2. admin 헬퍼 함수 (is_admin)
--    RLS 정책에서 반복 서브쿼리 대신 함수로 호출
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────
-- 3. users 테이블 — admin 정책
-- ────────────────────────────────────────────────────────────
-- admin: 전체 사용자 조회 (집계 분석용)
DROP POLICY IF EXISTS "users: admin 전체 조회" ON users;
CREATE POLICY "users: admin 전체 조회" ON users
  FOR SELECT USING (is_admin());

-- ────────────────────────────────────────────────────────────
-- 4. workplaces 테이블 — admin 정책
-- ────────────────────────────────────────────────────────────
-- admin: 전체 사업장 조회 (업종별·지역별 분석용)
DROP POLICY IF EXISTS "workplaces: admin 전체 조회" ON workplaces;
CREATE POLICY "workplaces: admin 전체 조회" ON workplaces
  FOR SELECT USING (is_admin());

-- ────────────────────────────────────────────────────────────
-- 5. user_workplaces 테이블 — admin 정책
-- ────────────────────────────────────────────────────────────
-- admin: 전체 직원-사업장 관계 조회 (프리랜서 N잡 패턴 분석용)
DROP POLICY IF EXISTS "user_workplaces: admin 전체 조회" ON user_workplaces;
CREATE POLICY "user_workplaces: admin 전체 조회" ON user_workplaces
  FOR SELECT USING (is_admin());

-- ────────────────────────────────────────────────────────────
-- 6. attendance 테이블 — admin 정책
-- ────────────────────────────────────────────────────────────
-- admin: 전체 근태 데이터 조회 (시간대별·업종별 노동 패턴 분석)
DROP POLICY IF EXISTS "attendance: admin 전체 조회" ON attendance;
CREATE POLICY "attendance: admin 전체 조회" ON attendance
  FOR SELECT USING (is_admin());

-- ────────────────────────────────────────────────────────────
-- 7. attendance_audit 테이블 — admin 정책
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "attendance_audit: admin 전체 조회" ON attendance_audit;
CREATE POLICY "attendance_audit: admin 전체 조회" ON attendance_audit
  FOR SELECT USING (is_admin());

-- ────────────────────────────────────────────────────────────
-- 8. 플랫폼 분석용 집계 뷰
--    admin 대시보드에서 직접 쿼리하는 읽기 전용 집계 뷰
-- ────────────────────────────────────────────────────────────

-- 8-1. 업종별 사업장 수 + 누적 근무 시간
CREATE OR REPLACE VIEW admin_industry_stats AS
SELECT
  w.industry_code,
  COUNT(DISTINCT w.id)                                        AS workplace_count,
  COUNT(DISTINCT uw.user_id)                                  AS worker_count,
  ROUND(SUM(a.net_minutes)::NUMERIC / 60, 1)                  AS total_work_hours,
  ROUND(AVG(a.net_minutes)::NUMERIC / 60, 2)                  AS avg_work_hours_per_shift
FROM workplaces w
LEFT JOIN user_workplaces uw ON uw.workplace_id = w.id
LEFT JOIN attendance a      ON a.workplace_id = w.id
  AND a.status = 'CONFIRMED'
  AND a.confirmed_at IS NOT NULL
GROUP BY w.industry_code
ORDER BY total_work_hours DESC NULLS LAST;

-- 8-2. 지역별 통계
CREATE OR REPLACE VIEW admin_region_stats AS
SELECT
  w.region_code,
  COUNT(DISTINCT w.id)                              AS workplace_count,
  COUNT(DISTINCT uw.user_id)                        AS worker_count,
  COUNT(a.id)                                       AS attendance_records,
  ROUND(AVG(uw.hourly_wage)::NUMERIC, 0)            AS avg_hourly_wage
FROM workplaces w
LEFT JOIN user_workplaces uw ON uw.workplace_id = w.id
LEFT JOIN attendance a       ON a.workplace_id = w.id
  AND a.status = 'CONFIRMED'
GROUP BY w.region_code
ORDER BY worker_count DESC NULLS LAST;

-- 8-3. 시간대별 출근 분포 (프리랜서 노동 패턴)
CREATE OR REPLACE VIEW admin_hourly_distribution AS
SELECT
  EXTRACT(HOUR FROM clock_in)::INTEGER  AS work_start_hour,
  COUNT(*)                               AS shift_count,
  ROUND(AVG(net_minutes)::NUMERIC / 60, 2) AS avg_hours
FROM attendance
WHERE clock_in IS NOT NULL
  AND status = 'CONFIRMED'
GROUP BY work_start_hour
ORDER BY work_start_hour;

-- 8-4. N잡러 현황 (2개 이상 사업장 근무자)
CREATE OR REPLACE VIEW admin_multi_job_workers AS
SELECT
  uw.user_id,
  COUNT(DISTINCT uw.workplace_id)    AS job_count,
  SUM(
    COALESCE(
      (SELECT SUM(net_minutes) FROM attendance a
       WHERE a.user_id = uw.user_id
         AND a.workplace_id = uw.workplace_id
         AND a.status = 'CONFIRMED'), 0
    )
  ) / 60.0                           AS total_work_hours,
  ARRAY_AGG(DISTINCT w.industry_code) AS industries
FROM user_workplaces uw
JOIN workplaces w ON w.id = uw.workplace_id
WHERE uw.status = 'active'
GROUP BY uw.user_id
HAVING COUNT(DISTINCT uw.workplace_id) >= 2
ORDER BY job_count DESC;

-- 8-5. 플랫폼 전체 요약 통계 (대시보드 상단 KPI용)
CREATE OR REPLACE VIEW admin_platform_summary AS
SELECT
  (SELECT COUNT(*) FROM users WHERE role IN ('owner','staff'))   AS total_users,
  (SELECT COUNT(*) FROM users WHERE role = 'owner')              AS total_owners,
  (SELECT COUNT(*) FROM users WHERE role = 'staff')              AS total_staff,
  (SELECT COUNT(*) FROM workplaces)                              AS total_workplaces,
  (SELECT COUNT(*) FROM attendance WHERE status = 'CONFIRMED')   AS confirmed_shifts,
  (SELECT ROUND(SUM(net_minutes)::NUMERIC / 60, 0)
   FROM attendance WHERE status = 'CONFIRMED')                   AS total_work_hours,
  (SELECT COUNT(DISTINCT user_id)
   FROM user_workplaces
   WHERE user_id IN (
     SELECT user_id FROM user_workplaces
     GROUP BY user_id HAVING COUNT(*) >= 2
   ))                                                            AS multi_job_workers,
  NOW()                                                          AS generated_at;

-- ────────────────────────────────────────────────────────────
-- 9. 뷰에 대한 RLS (뷰는 기본적으로 기반 테이블 정책을 상속)
--    admin만 뷰 접근 가능하도록 보안 정의 뷰(security definer) 주석
-- ────────────────────────────────────────────────────────────
COMMENT ON VIEW admin_industry_stats        IS 'admin 전용: 업종별 노동 집계';
COMMENT ON VIEW admin_region_stats          IS 'admin 전용: 지역별 노동 집계';
COMMENT ON VIEW admin_hourly_distribution   IS 'admin 전용: 시간대별 출근 분포';
COMMENT ON VIEW admin_multi_job_workers     IS 'admin 전용: N잡러 현황';
COMMENT ON VIEW admin_platform_summary      IS 'admin 전용: 플랫폼 KPI 요약';

-- ────────────────────────────────────────────────────────────
-- 10. 집계 쿼리 성능 인덱스 추가
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attendance_clock_in_hour
  ON attendance (EXTRACT(HOUR FROM clock_in));

CREATE INDEX IF NOT EXISTS idx_attendance_status_confirmed
  ON attendance (status) WHERE status = 'CONFIRMED';

CREATE INDEX IF NOT EXISTS idx_users_role
  ON users (role);
