import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { config } from './config/index.js'
import authRouter from './routes/auth.js'
import attendanceRouter from './routes/attendance.js'
import payrollRouter from './routes/payroll.js'
import workplacesRouter from './routes/workplaces.js'

const app = express()

// ─── CORS ──────────────────────────────────────────────────
// ALLOWED_ORIGINS: 쉼표로 구분된 허용 도메인 목록
// 예) https://admin.moara.app,https://moara.app
// 미설정 시 개발 기본값 사용
const allowedOrigins = (process.env['ALLOWED_ORIGINS'] ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .concat([
    'http://localhost:8081',
    'http://localhost:3000',
    'exp://localhost:8081',
  ])

app.use(cors({
  origin: (origin, cb) => {
    // 모바일 앱은 Origin 헤더가 없거나 null
    if (!origin || origin === 'null') return cb(null, true)
    cb(null, allowedOrigins.includes(origin))
  },
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

app.use(express.json())

// ─── 헬스체크 ───────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ ok: true, message: 'MOARA API 서버 정상 작동 중' })
})

// ─── 라우트 ─────────────────────────────────────────────────
app.use('/auth', authRouter)
app.use('/attendance', attendanceRouter)
app.use('/payroll', payrollRouter)
app.use('/workplaces', workplacesRouter)

// ─── 서버 시작 ──────────────────────────────────────────────
app.listen(config.port, () => {
  console.log(`🚀 API 서버 시작: http://localhost:${config.port}`)
  console.log(`SMS Provider: ${config.sms.provider}`)
  console.log(`NODE_ENV: ${config.nodeEnv}`)
})

export default app
