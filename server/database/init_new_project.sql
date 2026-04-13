-- ============================================================
-- Moara 신규 프로젝트 초기화 SQL
-- 실행 위치: Supabase Dashboard → SQL Editor → New Query
--
-- ⚠️ 이 파일은 새 Supabase 프로젝트용입니다.
--    SMS 커스텀 인증 방식 (auth.users FK 없음)
-- ============================================================

-- ─── 1. Users ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       VARCHAR(20) UNIQUE,
  name        VARCHAR(50),
  role        VARCHAR(10) CHECK (role IS NULL OR role IN ('owner', 'staff', 'admin')),
  created_at  TIMESTAMP   DEFAULT NOW()
);

-- ─── 2. Workplaces ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workplaces (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  gps_lat       DECIMAL(10,7),
  gps_lng       DECIMAL(10,7),
  wifi_ssid     VARCHAR(64),
  invite_code   VARCHAR(20) UNIQUE,
  industry_code VARCHAR(20) DEFAULT NULL,
  region_code   VARCHAR(10) DEFAULT NULL,
  created_at    TIMESTAMP   DEFAULT NOW()
);

-- ─── 3. UserWorkplaces ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_workplaces (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workplace_id UUID    NOT NULL REFERENCES workplaces(id) ON DELETE CASCADE,
  hourly_wage  INTEGER DEFAULT 10320,
  position     VARCHAR(50),
  status       VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'probation', 'resigned')),
  join_date    DATE    DEFAULT CURRENT_DATE,
  UNIQUE (user_id, workplace_id)
);

-- ─── 4. Attendance ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id           UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workplace_id UUID      NOT NULL REFERENCES workplaces(id) ON DELETE CASCADE,
  clock_in     TIMESTAMP,
  clock_out    TIMESTAMP,
  work_minutes INTEGER   DEFAULT 0,
  break_minutes INTEGER  DEFAULT 60,
  net_minutes  INTEGER   DEFAULT NULL,
  status       VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'REJECTED')),
  date         DATE      DEFAULT CURRENT_DATE,
  confirmed_at TIMESTAMP DEFAULT NULL,
  created_at   TIMESTAMP DEFAULT NOW()
);

-- ─── 5. AttendanceAudit ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_audit (
  id              UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id   UUID      NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
  prev_clock_out  TIMESTAMP,
  new_clock_out   TIMESTAMP,
  reason          TEXT,
  modified_by     UUID      REFERENCES users(id),
  modified_at     TIMESTAMP DEFAULT NOW()
);

-- ─── 6. OTP 임시 저장 ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_codes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      VARCHAR(20) NOT NULL,
  code       VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP   NOT NULL,
  used       BOOLEAN     DEFAULT false,
  created_at TIMESTAMP   DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_otp_phone_expires ON otp_codes (phone, expires_at);

-- ─── 7. RefreshTokens ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT      NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens (token);

-- ─── 8. EventLogs ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  user_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
  payload    JSONB       DEFAULT '{}',
  created_at TIMESTAMP   DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_event_logs_user_id    ON event_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_event_type ON event_logs (event_type);

-- ─── 9. 인덱스 ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attendance_user_date
  ON attendance (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_workplace_date
  ON attendance (workplace_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_status
  ON attendance (status) WHERE status = 'CONFIRMED';
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- ─── 10. RLS (Row Level Security) ───────────────────────────
-- 백엔드는 service_role 키 사용 → RLS 자동 우회
-- 각 테이블에 RLS 활성화만 (정책은 최소화)
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE workplaces       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_workplaces  ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance       ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens   ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs       ENABLE ROW LEVEL SECURITY;

-- service_role은 RLS 자동 우회이므로 별도 정책 없이도 백엔드 접근 가능
-- (anon/authenticated 키는 RLS 정책이 없으면 접근 불가 → 보안 유지)
