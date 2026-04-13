import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { supabaseAdmin } from '../lib/supabase.js'
import { sendSms } from '../services/sms.js'
import { config } from '../config/index.js'
import { authenticateJwt, type AuthRequest } from '../middleware/auth.js'

const router = Router()

// OTP 인메모리 저장소 (phone → { code, expiresAt })
const otpStore = new Map<string, { code: string; expiresAt: number }>()

const OTP_TTL_MS = 5 * 60 * 1000  // 5분
const CODE_LENGTH = 6

function generateCode(): string {
  return String(Math.floor(Math.random() * 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0')
}

function issueTokens(userId: string, phone: string, role: string) {
  const accessToken = jwt.sign(
    { sub: userId, phone, role },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpires as jwt.SignOptions['expiresIn'] }
  )
  const refreshToken = jwt.sign(
    { sub: userId, phone, role },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpires as jwt.SignOptions['expiresIn'] }
  )
  return { accessToken, refreshToken }
}

// ─── POST /auth/sms/send ────────────────────────────────────
router.post('/sms/send', async (req, res) => {
  const { phone } = req.body as { phone?: string }

  if (!phone) {
    res.status(400).json({ ok: false, error: { message: '전화번호를 입력해주세요.' } })
    return
  }

  const code = generateCode()
  otpStore.set(phone, { code, expiresAt: Date.now() + OTP_TTL_MS })

  try {
    await sendSms(phone, `[MOARA] 인증번호: ${code}`)
  } catch (err) {
    console.error('SMS 발송 실패:', err)
    res.status(500).json({ ok: false, error: { message: 'SMS 발송에 실패했습니다.' } })
    return
  }

  const isMock = config.sms.provider === 'mock'
  res.json({
    ok: true,
    data: {
      message: 'OTP가 발송되었습니다.',
      ...(isMock && { devCode: code }),
    },
  })
})

// ─── POST /auth/sms/verify ──────────────────────────────────
router.post('/sms/verify', async (req, res) => {
  const { phone, code, role, name } = req.body as {
    phone?: string
    code?: string
    role?: string
    name?: string
  }

  if (!phone || !code) {
    res.status(400).json({ ok: false, error: { message: '전화번호와 인증번호를 입력해주세요.' } })
    return
  }

  const stored = otpStore.get(phone)

  if (!stored) {
    res.status(400).json({ ok: false, error: { message: '인증번호를 먼저 요청해주세요.' } })
    return
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(phone)
    res.status(400).json({ ok: false, error: { message: '인증번호가 만료되었습니다. 다시 요청해주세요.' } })
    return
  }

  if (stored.code !== code) {
    res.status(400).json({ ok: false, error: { message: '인증번호가 올바르지 않습니다.' } })
    return
  }

  otpStore.delete(phone)

  // supabaseAdmin으로 users 테이블 upsert (Prisma 사용 금지)
  const { data: upserted, error: upsertErr } = await supabaseAdmin
    .from('users')
    .upsert(
      { phone, name: name ?? phone, role: role ?? null },
      { onConflict: 'phone' }
    )
    .select()
    .single()

  if (upsertErr || !upserted) {
    console.error('사용자 upsert 실패:', upsertErr)
    res.status(500).json({ ok: false, error: { message: '사용자 정보 저장에 실패했습니다.' } })
    return
  }

  const tokens = issueTokens(upserted.id, phone, upserted.role ?? '')

  res.json({
    ok: true,
    data: {
      user: {
        id: upserted.id,
        phone: upserted.phone,
        name: upserted.name,
        role: upserted.role,
      },
      tokens,
    },
  })
})

// ─── POST /auth/refresh ────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string }

  if (!refreshToken) {
    res.status(400).json({ ok: false, error: { message: '리프레시 토큰이 필요합니다.' } })
    return
  }

  try {
    const payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as {
      sub: string; phone: string; role: string
    }
    const tokens = issueTokens(payload.sub, payload.phone, payload.role)
    res.json({ ok: true, data: { tokens } })
  } catch {
    res.status(401).json({ ok: false, error: { message: '유효하지 않은 리프레시 토큰입니다.' } })
  }
})

// ─── PATCH /auth/role — 역할 설정 (인증 후) ────────────────
router.patch('/role', authenticateJwt, async (req: AuthRequest, res) => {
  const { role } = req.body as { role?: string }

  if (!role || !['owner', 'staff'].includes(role)) {
    res.status(400).json({ ok: false, error: { message: 'role은 owner 또는 staff여야 합니다.' } })
    return
  }

  const userId = req.user!.sub

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ role })
    .eq('id', userId)
    .select()
    .single()

  if (error || !data) {
    res.status(500).json({ ok: false, error: { message: '역할 업데이트에 실패했습니다.' } })
    return
  }

  const tokens = issueTokens(data.id, data.phone, data.role)

  res.json({ ok: true, data: { user: data, tokens } })
})

// ─── PATCH /auth/profile — 이름 업데이트 ───────────────────
router.patch('/profile', authenticateJwt, async (req: AuthRequest, res) => {
  const { name } = req.body as { name?: string }

  if (!name || name.trim().length < 2) {
    res.status(400).json({ ok: false, error: { message: '이름은 2자 이상이어야 합니다.' } })
    return
  }

  const userId = req.user!.sub

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ name: name.trim() })
    .eq('id', userId)
    .select()
    .single()

  if (error || !data) {
    res.status(500).json({ ok: false, error: { message: '이름 업데이트에 실패했습니다.' } })
    return
  }

  res.json({ ok: true, data: { user: data } })
})

export default router
