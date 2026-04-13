-- ============================================================
-- Migration 002: users.role 컬럼을 NULL 허용으로 변경
-- 실행 위치: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. 기존 CHECK 제약 제거
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- 2. NOT NULL 제약 제거 (nullable로 변경)
ALTER TABLE users ALTER COLUMN role DROP NOT NULL;

-- 3. NULL 허용 + 값 검증 CHECK 제약 재추가
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IS NULL OR role IN ('owner', 'staff'));

-- 4. 신규 가입 트리거 함수 교체
--    (phone OTP 인증 시 id만으로 row 생성, role은 이후 선택)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RLS 정책: 본인 row INSERT 허용
DROP POLICY IF EXISTS "users: 본인 row 생성" ON users;
CREATE POLICY "users: 본인 row 생성" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 6. 코멘트
COMMENT ON COLUMN users.role IS
  'User role: owner(사장님) or staff(직원). 전화번호 가입 직후에는 NULL, role-select 화면에서 선택 후 업데이트됨.';
