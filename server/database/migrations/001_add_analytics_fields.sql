-- ─────────────────────────────────────────────────────────────────
-- 001_add_analytics_fields.sql
-- 관리자 분석 페이지용 필드 추가 (업종별·지역별·시간대별 집계)
--
-- 실행: psql -d <DB명> -f 001_add_analytics_fields.sql
-- ─────────────────────────────────────────────────────────────────

-- workplaces 테이블
-- 참고: gps_lat, gps_lng 는 초기 스키마에 이미 포함돼 있으므로
--       IF NOT EXISTS 로 안전하게 처리
ALTER TABLE workplaces
  ADD COLUMN IF NOT EXISTS industry_code VARCHAR(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS region_code   VARCHAR(10) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gps_lat       DECIMAL(10,7) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gps_lng       DECIMAL(10,7) DEFAULT NULL;

-- attendance 테이블
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS net_minutes  INTEGER   DEFAULT NULL;

-- ─────────────────────────────────────────────────────────────────
-- 인덱스 (집계 쿼리 성능)
-- ─────────────────────────────────────────────────────────────────

-- 확정된 근태 데이터만 필터링 (confirmed_at IS NOT NULL)
CREATE INDEX IF NOT EXISTS idx_attendance_confirmed
  ON attendance(confirmed_at)
  WHERE confirmed_at IS NOT NULL;

-- 업종별 집계
CREATE INDEX IF NOT EXISTS idx_workplace_industry
  ON workplaces(industry_code);

-- 지역별 집계
CREATE INDEX IF NOT EXISTS idx_workplace_region
  ON workplaces(region_code);
