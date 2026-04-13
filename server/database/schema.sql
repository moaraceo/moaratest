-- ============================================================
-- Moara 데이터베이스 스키마
-- Supabase Auth 연동 + Row Level Security (RLS)
-- ============================================================

-- 사용자 프로필 테이블
-- auth.users(id) 를 참조 → Supabase Auth가 생성한 UUID 사용
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(50),
  role VARCHAR(10) NOT NULL CHECK (role IN ('owner', 'staff')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 사업장 테이블
CREATE TABLE workplaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  gps_lat DECIMAL(10,7),
  gps_lng DECIMAL(10,7),
  wifi_ssid VARCHAR(64),
  invite_code VARCHAR(20) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  industry_code VARCHAR(20) DEFAULT NULL,
  region_code VARCHAR(10) DEFAULT NULL
);

-- 직원-사업장 연결 테이블
CREATE TABLE user_workplaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workplace_id UUID NOT NULL REFERENCES workplaces(id) ON DELETE CASCADE,
  hourly_wage INTEGER DEFAULT 10320,
  position VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'probation', 'resigned')),
  join_date DATE DEFAULT CURRENT_DATE,
  UNIQUE (user_id, workplace_id)
);

-- 근태 테이블
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workplace_id UUID NOT NULL REFERENCES workplaces(id) ON DELETE CASCADE,
  clock_in TIMESTAMP,
  clock_out TIMESTAMP,
  work_minutes INTEGER DEFAULT 0,
  break_minutes INTEGER DEFAULT 60,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'REJECTED')),
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP DEFAULT NULL,
  net_minutes INTEGER DEFAULT NULL
);

-- 근태 수정 이력 테이블
CREATE TABLE attendance_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id UUID NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
  prev_clock_out TIMESTAMP,
  new_clock_out TIMESTAMP,
  reason TEXT,
  modified_by UUID REFERENCES users(id),
  modified_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 트리거: 회원가입 시 users 테이블 자동 생성
-- Supabase Auth에서 signUp() 호출 시 자동으로 프로필 행 삽입
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Row Level Security (RLS) 활성화
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workplaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_workplaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_audit ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- users 정책
-- ============================================================
-- 본인 프로필만 조회/수정
CREATE POLICY "users: 본인만 조회" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users: 본인만 수정" ON users
  FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- workplaces 정책
-- ============================================================
-- 사장: 자신의 사업장 전체 관리
CREATE POLICY "workplaces: 사장 전체 관리" ON workplaces
  FOR ALL USING (auth.uid() = owner_id);

-- 직원: 소속 사업장 조회
CREATE POLICY "workplaces: 직원 조회" ON workplaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_workplaces
      WHERE workplace_id = workplaces.id AND user_id = auth.uid()
    )
  );

-- ============================================================
-- user_workplaces 정책
-- ============================================================
-- 사장: 자신의 사업장 직원 목록 전체 관리
CREATE POLICY "user_workplaces: 사장 관리" ON user_workplaces
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workplaces
      WHERE id = user_workplaces.workplace_id AND owner_id = auth.uid()
    )
  );

-- 직원: 본인 소속 정보 조회
CREATE POLICY "user_workplaces: 직원 본인 조회" ON user_workplaces
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- attendance 정책
-- ============================================================
-- 직원: 본인 근태 조회/삽입
CREATE POLICY "attendance: 직원 본인 관리" ON attendance
  FOR ALL USING (auth.uid() = user_id);

-- 사장: 소속 사업장 전체 근태 조회 및 승인
CREATE POLICY "attendance: 사장 사업장 관리" ON attendance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workplaces
      WHERE id = attendance.workplace_id AND owner_id = auth.uid()
    )
  );

-- ============================================================
-- attendance_audit 정책
-- ============================================================
-- 사장: 자신의 사업장 수정 이력 조회
CREATE POLICY "attendance_audit: 사장 조회" ON attendance_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM attendance a
      JOIN workplaces w ON w.id = a.workplace_id
      WHERE a.id = attendance_audit.attendance_id AND w.owner_id = auth.uid()
    )
  );

-- 수정자: 본인이 작성한 이력 조회
CREATE POLICY "attendance_audit: 수정자 조회" ON attendance_audit
  FOR SELECT USING (auth.uid() = modified_by);
