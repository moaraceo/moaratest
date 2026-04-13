/**
 * MOARA API 서버 (Cloudflare Workers + Hono)
 *
 * [보안 수정: CORS]
 * ❌ 이전: app.use('*', cors())
 *    - 모든 출처(Origin)에서 요청 허용 → CSRF 공격 노출 위험
 *
 * ✅ 현재: origin 화이트리스트 + 허용 메서드·헤더 명시
 *    - 개발: localhost:8081 (Expo 개발 서버)
 *    - 프로덕션: 실제 앱 도메인 추가 필요
 *    - 모바일 앱은 Origin 헤더가 null이므로 null도 허용 (React Native)
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import authRoutes from './routes/auth'
import attendanceRoutes from './routes/attendance'
import payrollRoutes from './routes/payroll'
import adminRoutes from './routes/admin'

export type Bindings = {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  JWT_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

// ─── CORS 설정 ──────────────────────────────────────────────────────────────
// React Native 앱은 Origin: null 또는 Origin 헤더 없이 요청하므로 null 포함
const ALLOWED_ORIGINS = [
  'http://localhost:8081',    // Expo 개발 서버
  'http://localhost:3000',    // 웹 개발 서버
  'exp://localhost:8081',     // Expo Go 앱
]

app.use('*', cors({
  origin: (origin) => {
    // 모바일 앱 (React Native)은 Origin 헤더가 없거나 null
    if (!origin || origin === 'null') return origin ?? ''
    // 화이트리스트 확인
    if (ALLOWED_ORIGINS.includes(origin)) return origin
    // 허용되지 않은 출처
    return ''
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 86400,       // Preflight 캐시: 24시간
  credentials: true,
}))

// ─── 라우트 ─────────────────────────────────────────────────────────────────
app.get('/', (c) => c.text('MOARA API 서버 정상 작동 중'))

app.route('/api/auth', authRoutes)
app.route('/api/attendance', attendanceRoutes)
app.route('/api/payroll', payrollRoutes)

// Admin 라우트 (authMiddleware + adminMiddleware 내부 적용)
app.route('/api/admin', adminRoutes)

export default app
