-- ============================================================
-- Migration 004: SMS 커스텀 인증 지원
-- - users.id의 auth.users FK 제약 제거 (자체 JWT 발급 방식)
-- - id 컬럼 DEFAULT 추가
-- - phone 컬럼 추가 (SMS 인증 식별자)
-- - otp_codes 테이블 추가 (OTP 임시 저장)
-- - refresh_tokens 테이블 추가 (리프레시 토큰)
--
-- 실행 위치: Supabase Dashboard → SQL Editor
-- 실행 순서: 001 → 002 → 003 → 004
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. users 테이블 FK 제약 제거 (auth.users 의존성 해제)
-- ────────────────────────────────────────────────────────────
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- id 컬럼에 UUID 기본값 추가
ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- ────────────────────────────────────────────────────────────
-- 2. phone 컬럼 추가
-- ────────────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) UNIQUE;

-- ────────────────────────────────────────────────────────────
-- 3. OTP 임시 저장 테이블
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_codes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      VARCHAR(20) NOT NULL,
  code       VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP   NOT NULL,
  used       BOOLEAN     DEFAULT false,
  created_at TIMESTAMP   DEFAULT NOW()
);

-- OTP는 5분 TTL → 만료된 행 자동 청소를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_otp_phone_expires
  ON otp_codes (phone, expires_at);

-- ────────────────────────────────────────────────────────────
-- 4. 리프레시 토큰 테이블
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT    NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token
  ON refresh_tokens (token);

-- ────────────────────────────────────────────────────────────
-- 5. 이벤트 로그 테이블 (Prisma EventLog 모델 대응)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  VARCHAR(50) NOT NULL,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  payload     JSONB DEFAULT '{}',
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_logs_user_id
  ON event_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_event_logs_event_type
  ON event_logs (event_type);

-- ────────────────────────────────────────────────────────────
-- 6. users 기존 트리거 제거 (auth.users 연동 불필요)
-- ────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ────────────────────────────────────────────────────────────
-- 7. RLS 정책 업데이트 — service_role은 항상 우회 가능
--    otp_codes, refresh_tokens는 백엔드 서비스만 접근
-- ────────────────────────────────────────────────────────────
ALTER TABLE otp_codes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs    ENABLE ROW LEVEL SECURITY;

-- 모든 접근은 service_role 키(백엔드)를 통해서만 허용
-- (RLS가 활성화되면 anon/authenticated 키로는 접근 불가)
-- service_role은 RLS를 자동으로 우회함

COMMENT ON TABLE otp_codes      IS 'SMS OTP 임시 저장 (5분 TTL)';
COMMENT ON TABLE refresh_tokens IS 'JWT 리프레시 토큰 저장';
COMMENT ON TABLE event_logs     IS '애플리케이션 이벤트 로그';
