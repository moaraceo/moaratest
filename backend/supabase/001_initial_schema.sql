-- ════════════════════════════════════════════
-- MOARA 초기 스키마 (Supabase SQL Editor에서 실행)
-- 실행 전 auth.users 테이블이 있어야 함 (Supabase 기본 제공)
-- ════════════════════════════════════════════

-- ── 1. users (앱 사용자) ─────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       TEXT UNIQUE,
  email       TEXT UNIQUE,
  name        TEXT,
  role        TEXT CHECK (role IN ('owner', 'staff', 'admin')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. workplaces (사업장) ───────────────────
CREATE TABLE IF NOT EXISTS public.workplaces (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  address              TEXT,
  owner_id             UUID REFERENCES public.users(id) ON DELETE CASCADE,
  invite_code          TEXT UNIQUE,
  invite_code_expiry   TIMESTAMPTZ,
  industry_code        TEXT,
  region_code          TEXT,
  gps_lat              NUMERIC,
  gps_lng              NUMERIC,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. user_workplaces (직원↔사업장, 시급 포함) ──
CREATE TABLE IF NOT EXISTS public.user_workplaces (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES public.users(id) ON DELETE CASCADE,
  workplace_id         UUID REFERENCES public.workplaces(id) ON DELETE CASCADE,
  hourly_wage          INTEGER NOT NULL,
  position             TEXT,
  status               TEXT DEFAULT 'active' CHECK (status IN ('active', 'probation', 'resigned')),
  join_date            DATE,
  resign_date          DATE,
  rejoin_date          DATE,
  wage_effective_date  DATE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, workplace_id)
);

-- ── 4. attendance (근태 기록) ────────────────
CREATE TABLE IF NOT EXISTS public.attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE,
  workplace_id    UUID REFERENCES public.workplaces(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  clock_in        TIMESTAMPTZ NOT NULL,
  clock_out       TIMESTAMPTZ,
  work_minutes    INTEGER DEFAULT 0,
  net_minutes     INTEGER DEFAULT 0,
  break_minutes   INTEGER DEFAULT 60,
  status          TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'REJECTED')),
  confirmed_at    TIMESTAMPTZ,
  modify_request  JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. payroll_settings (사업장별 급여 설정) ──
CREATE TABLE IF NOT EXISTS public.payroll_settings (
  workplace_id  UUID PRIMARY KEY REFERENCES public.workplaces(id) ON DELETE CASCADE,
  settings      JSONB NOT NULL DEFAULT '{}',
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════
-- RLS (Row Level Security) 설정
-- ════════════════════════════════════════════

ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workplaces       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_workplaces  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;

-- 백엔드 서비스 롤(service_role)은 RLS 우회 — 모바일은 직접 접근 안 함
-- 모바일은 백엔드 API를 통해서만 DB 접근 → anon key로 직접 쿼리 불가

-- users: 본인 데이터만 읽기
CREATE POLICY "users_self_read"  ON public.users FOR SELECT USING (id::text = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "users_self_write" ON public.users FOR UPDATE USING (id::text = current_setting('request.jwt.claims', true)::json->>'sub');

-- workplaces: service_role만 (모바일 → 백엔드 API 경유)
-- anon/authenticated 접근 없음 — 정책 없음 = 차단

-- user_workplaces, attendance, payroll_settings: 동일하게 service_role 전용

-- ════════════════════════════════════════════
-- 인덱스
-- ════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_workplaces_owner       ON public.workplaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_user_workplaces_user   ON public.user_workplaces(user_id);
CREATE INDEX IF NOT EXISTS idx_user_workplaces_wp     ON public.user_workplaces(workplace_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user        ON public.attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_workplace   ON public.attendance(workplace_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date        ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status      ON public.attendance(status);
