import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { authenticateJwt, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(authenticateJwt)

// GET /attendance — 내 근태 목록
router.get('/', async (req: AuthRequest, res) => {
  const userId = req.user!.sub
  const { workplace_id, date_from, date_to } = req.query as Record<string, string>

  let query = supabaseAdmin
    .from('attendance')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })

  if (workplace_id) query = query.eq('workplace_id', workplace_id)
  if (date_from)    query = query.gte('date', date_from)
  if (date_to)      query = query.lte('date', date_to)

  const { data, error } = await query

  if (error) {
    res.status(500).json({ ok: false, error: { message: error.message } })
    return
  }

  res.json({ ok: true, data })
})

// POST /attendance/clock-in — 출근
router.post('/clock-in', async (req: AuthRequest, res) => {
  const userId = req.user!.sub
  const { workplace_id } = req.body as { workplace_id?: string }

  if (!workplace_id) {
    res.status(400).json({ ok: false, error: { message: 'workplace_id가 필요합니다.' } })
    return
  }

  const { data, error } = await supabaseAdmin
    .from('attendance')
    .insert({
      user_id: userId,
      workplace_id,
      clock_in: new Date().toISOString(),
      status: 'PENDING',
      date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single()

  if (error) {
    res.status(500).json({ ok: false, error: { message: error.message } })
    return
  }

  res.status(201).json({ ok: true, data })
})

// POST /attendance/:id/clock-out — 퇴근
router.post('/:id/clock-out', async (req: AuthRequest, res) => {
  const userId = req.user!.sub
  const { id } = req.params

  const clockOut = new Date()

  // 출근 시간 조회
  const { data: existing } = await supabaseAdmin
    .from('attendance')
    .select('clock_in')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  const workMinutes = existing?.clock_in
    ? Math.floor((clockOut.getTime() - new Date(existing.clock_in).getTime()) / 60000)
    : 0
  const breakMinutes = workMinutes > 240 ? 60 : 0
  const netMinutes = Math.max(0, workMinutes - breakMinutes)

  const { data, error } = await supabaseAdmin
    .from('attendance')
    .update({
      clock_out: clockOut.toISOString(),
      work_minutes: workMinutes,
      net_minutes: netMinutes,
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    res.status(500).json({ ok: false, error: { message: error.message } })
    return
  }

  res.json({ ok: true, data })
})

// PATCH /attendance/:id/confirm — 사장님 승인
router.patch('/:id/confirm', async (req: AuthRequest, res) => {
  const { id } = req.params

  const { data, error } = await supabaseAdmin
    .from('attendance')
    .update({ status: 'CONFIRMED', confirmed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    res.status(500).json({ ok: false, error: { message: error.message } })
    return
  }

  res.json({ ok: true, data })
})

export default router
