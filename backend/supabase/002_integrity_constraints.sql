-- ════════════════════════════════════════════════════════════════
-- MOARA 002: DB 무결성 제약 (confirmed_payroll + attendance 보호)
-- Supabase SQL Editor 또는 psql로 실행
-- ════════════════════════════════════════════════════════════════

-- ── 1. confirmed_payroll 테이블 생성 (없을 경우) ─────────────────
CREATE TABLE IF NOT EXISTS public.confirmed_payroll (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  workplace_id    UUID NOT NULL REFERENCES public.workplaces(id) ON DELETE CASCADE,
  year_month      TEXT NOT NULL,               -- 'YYYY-MM'
  grand_total     INTEGER NOT NULL,            -- 세전 총합계 (원)
  base_wage       INTEGER NOT NULL DEFAULT 0,
  overtime_wage   INTEGER NOT NULL DEFAULT 0,
  night_wage      INTEGER NOT NULL DEFAULT 0,
  holiday_wage    INTEGER NOT NULL DEFAULT 0,
  weekly_holiday_pay INTEGER NOT NULL DEFAULT 0,
  total_net_minutes  INTEGER NOT NULL DEFAULT 0,
  payroll_snapshot   JSONB,                    -- 계산 당시 설정값 스냅샷
  confirmed_by    UUID REFERENCES public.users(id),
  confirmed_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  -- 동일 사용자·사업장·월 중복 방지
  CONSTRAINT uq_confirmed_payroll_per_month
    UNIQUE (user_id, workplace_id, year_month)
);

ALTER TABLE public.confirmed_payroll ENABLE ROW LEVEL SECURITY;

-- ── 2. confirmed_payroll 불변 트리거 (UPDATE/DELETE 완전 차단) ───
CREATE OR REPLACE FUNCTION public.prevent_confirmed_payroll_mutation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RAISE EXCEPTION
    'confirmed_payroll은 수정·삭제할 수 없습니다. (id: %)', OLD.id
    USING ERRCODE = '55000'; -- object_not_in_prerequisite_state
END;
$$;

DROP TRIGGER IF EXISTS lock_confirmed_payroll_update ON public.confirmed_payroll;
CREATE TRIGGER lock_confirmed_payroll_update
  BEFORE UPDATE ON public.confirmed_payroll
  FOR EACH ROW EXECUTE FUNCTION public.prevent_confirmed_payroll_mutation();

DROP TRIGGER IF EXISTS lock_confirmed_payroll_delete ON public.confirmed_payroll;
CREATE TRIGGER lock_confirmed_payroll_delete
  BEFORE DELETE ON public.confirmed_payroll
  FOR EACH ROW EXECUTE FUNCTION public.prevent_confirmed_payroll_mutation();

-- ── 3. attendance CONFIRMED 레코드 보호 트리거 ──────────────────
-- clock-out, clock-in 등 업데이트 시 CONFIRMED 레코드 차단
CREATE OR REPLACE FUNCTION public.prevent_confirmed_attendance_mutation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- status가 CONFIRMED→다른값 변경은 허용 (반려 취소 등 관리 목적)
  -- 그 외 CONFIRMED 상태 레코드의 시간 필드 변경 차단
  IF OLD.status = 'CONFIRMED' AND (
    OLD.clock_in   IS DISTINCT FROM NEW.clock_in   OR
    OLD.clock_out  IS DISTINCT FROM NEW.clock_out  OR
    OLD.work_minutes IS DISTINCT FROM NEW.work_minutes OR
    OLD.net_minutes  IS DISTINCT FROM NEW.net_minutes
  ) THEN
    RAISE EXCEPTION
      '확정된 근태 기록의 시간은 수정할 수 없습니다. (id: %)', OLD.id
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lock_confirmed_attendance ON public.attendance;
CREATE TRIGGER lock_confirmed_attendance
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.prevent_confirmed_attendance_mutation();

-- ── 4. confirmed_payroll 인덱스 ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_confirmed_payroll_user
  ON public.confirmed_payroll(user_id);
CREATE INDEX IF NOT EXISTS idx_confirmed_payroll_workplace
  ON public.confirmed_payroll(workplace_id);
CREATE INDEX IF NOT EXISTS idx_confirmed_payroll_month
  ON public.confirmed_payroll(year_month);

-- ── 5. 무결성 검증 쿼리 (실행 후 아래로 결과 확인) ──────────────
-- 트리거 목록 확인
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('confirmed_payroll', 'attendance')
ORDER BY event_object_table, trigger_name;
