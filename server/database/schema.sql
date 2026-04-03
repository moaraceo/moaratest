-- 사용자 테이블
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  role VARCHAR(10) NOT NULL, -- 'owner' or 'staff'
  name VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 사업장 테이블
CREATE TABLE workplaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id),
  name VARCHAR(100) NOT NULL,
  gps_lat DECIMAL(10,7),
  gps_lng DECIMAL(10,7),
  wifi_ssid VARCHAR(64),
  invite_code VARCHAR(20) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 직원-사업장 연결 테이블
CREATE TABLE user_workplaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  workplace_id UUID REFERENCES workplaces(id),
  hourly_wage INTEGER DEFAULT 10320,
  position VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  join_date DATE DEFAULT CURRENT_DATE
);

-- 근태 테이블
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  workplace_id UUID REFERENCES workplaces(id),
  clock_in TIMESTAMP,
  clock_out TIMESTAMP,
  work_minutes INTEGER DEFAULT 0,
  break_minutes INTEGER DEFAULT 60,
  status VARCHAR(20) DEFAULT 'PENDING',
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 근태 수정 이력 테이블
CREATE TABLE attendance_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id UUID REFERENCES attendance(id),
  prev_clock_out TIMESTAMP,
  new_clock_out TIMESTAMP,
  reason TEXT,
  modified_by UUID REFERENCES users(id),
  modified_at TIMESTAMP DEFAULT NOW()
);
