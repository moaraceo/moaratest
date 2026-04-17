import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { authenticateJwt, requireOwnerRole, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(authenticateJwt)

// GET /attendance — 근태 목록
// - STAFF: 본인 기록만
// - OWNER: workplace_id에 속한 전체 직원 기록 (workplace_id 필수)
router.get('/', async (req: AuthRequest, res) => {
  const userId = req.user!.sub
  const role = req.user!.role
  const { workplace_id, date_from, date_to, staff_user_id } = req.query as Record<string, string>

  if (role === 'owner') {
    // [H-3 수정] OWNER는 본인 소유 사업장의 전체 직원 근태 조회 가능
    if (!workplace_id) {
      res.status(400).json({ ok: false, error: { message: 'OWNER는 workplace_id가 필요합니다.' } })
      return
    }

    // 사업장 소유권 확인
    const { data: workplace, error: wpErr } = await supabaseAdmin
      .from('workplaces')
      .select('id')
      .eq('id', workplace_id)
      .eq('owner_id', userId)
      .maybeSingle()

    if (wpErr || !workplace) {
      res.status(403).json({ ok: false, error: { message: '해당 사업장에 대한 권한이 없습니다.' } })
      return
    }

    // 직원 이름을 함께 조회 (users 테이블 JOIN)
    let query = supabaseAdmin
      .from('attendance')
      .select('*, users!user_id(name)')
      .eq('workplace_id', workplace_id)
      .order('date', { ascending: false })

    // 특정 직원만 필터링 (선택)
    if (staff_user_id) query = query.eq('user_id', staff_user_id)
    if (date_from) query = query.gte('date', date_from)
    if (date_to)   query = query.lte('date', date_to)

    const { data, error } = await query
    if (error) {
      res.status(500).json({ ok: false, error: { message: error.message } })
      return
    }
    res.json({ ok: true, data })
    return
  }

  // STAFF: 본인 기록만
  let query = supabaseAdmin
    .from('attendance')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })

  if (workplace_id) query = query.eq('workplace_id', workplace_id)

  if (date_from) query = query.gte('date', date_from)
  if (date_to)   query = query.lte('date', date_to)

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

// PATCH /attendance/:id/confirm — 사장님 승인 (OWNER 전용)
router.patch('/:id/confirm', requireOwnerRole, async (req: AuthRequest, res) => {
  if (req.user!.role !== 'owner') {
    res.status(403).json({ ok: false, error: { message: '사업주만 근태를 승인할 수 있습니다.' } })
    return
  }

  const { id } = req.params
  const ownerId = req.user!.sub

  // 해당 근태 기록이 사장님 소유 사업장에 속하는지 확인
  const { data: attendance } = await supabaseAdmin
    .from('attendance')
    .select('workplace_id')
    .eq('id', id)
    .single()

  if (!attendance) {
    res.status(404).json({ ok: false, error: { message: '근태 기록을 찾을 수 없습니다.' } })
    return
  }

  const { data: workplace } = await supabaseAdmin
    .from('workplaces')
    .select('id')
    .eq('id', attendance.workplace_id)
    .eq('owner_id', ownerId)
    .single()

  if (!workplace) {
    res.status(403).json({ ok: false, error: { message: '해당 사업장의 사업주만 승인할 수 있습니다.' } })
    return
  }

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

// PATCH /attendance/:id — 사장님 근태 수정 (OWNER 전용, PENDING만)
router.patch('/:id', requireOwnerRole, async (req: AuthRequest, res) => {
  if (req.user!.role !== 'owner') {
    res.status(403).json({ ok: false, error: { message: '사업주만 근태를 수정할 수 있습니다.' } })
    return
  }

  const { id } = req.params
  const { clock_in, clock_out, break_minutes, reason } = req.body as {
    clock_in?: string    // 'HH:MM'
    clock_out?: string   // 'HH:MM'
    break_minutes?: number
    reason?: string
  }

  // HH:MM 형식 검증
  const HH_MM = /^\d{2}:\d{2}$/
  if ((clock_in && !HH_MM.test(clock_in)) || (clock_out && !HH_MM.test(clock_out))) {
    res.status(400).json({ ok: false, error: { message: '시간은 HH:MM 형식이어야 합니다.' } })
    return
  }

  // 현재 레코드 조회
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('attendance')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !existing) {
    res.status(404).json({ ok: false, error: { message: '근태 기록을 찾을 수 없습니다.' } })
    return
  }

  // CONFIRMED 레코드 수정 불가
  if (existing.status === 'CONFIRMED') {
    res.status(409).json({ ok: false, error: { message: '확정된 근태는 수정할 수 없습니다.' } })
    return
  }

  // 사장님 소유 사업장 확인
  const { data: workplace } = await supabaseAdmin
    .from('workplaces')
    .select('id')
    .eq('id', existing.workplace_id)
    .eq('owner_id', req.user!.sub)
    .single()

  if (!workplace) {
    res.status(403).json({ ok: false, error: { message: '해당 사업장의 사업주만 수정할 수 있습니다.' } })
    return
  }

  // HH:MM → 해당 날짜 기준 ISO datetime 변환
  const dateStr: string = existing.date as string  // 'YYYY-MM-DD'
  const toISO = (hhMM: string): string => {
    const [h, m] = hhMM.split(':').map(Number)
    const d = new Date(`${dateStr}T00:00:00`)
    d.setHours(h!, m!, 0, 0)
    return d.toISOString()
  }

  const newClockIn  = clock_in  ? toISO(clock_in)  : (existing.clock_in  as string)
  const newClockOut = clock_out ? toISO(clock_out) : (existing.clock_out as string)

  // 자정 넘기는 야간 근무 처리
  let clockInMs  = new Date(newClockIn).getTime()
  let clockOutMs = new Date(newClockOut).getTime()
  if (clockOutMs < clockInMs) clockOutMs += 24 * 60 * 60 * 1000

  const breakMin    = typeof break_minutes === 'number' ? break_minutes : ((existing.break_minutes as number) ?? 60)
  const workMinutes = Math.floor((clockOutMs - clockInMs) / 60000)
  const netMinutes  = Math.max(0, workMinutes - breakMin)

  const { data, error } = await supabaseAdmin
    .from('attendance')
    .update({
      clock_in:      newClockIn,
      clock_out:     newClockOut,
      break_minutes: breakMin,
      work_minutes:  workMinutes,
      net_minutes:   netMinutes,
      modify_request: {
        originalClockIn:  existing.clock_in,
        originalClockOut: existing.clock_out,
        requestedClockIn:  newClockIn,
        requestedClockOut: newClockOut,
        reason:      reason ?? '',
        modifiedBy:  req.user!.sub,
        modifiedAt:  new Date().toISOString(),
      },
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    res.status(500).json({ ok: false, error: { message: error.message } })
    return
  }

  res.json({ ok: true, data })
})

// PATCH /attendance/:id/reject — 근태 반려 (OWNER 전용)
router.patch('/:id/reject', requireOwnerRole, async (req: AuthRequest, res) => {
  if (req.user!.role !== 'owner') {
    res.status(403).json({ ok: false, error: { message: '사업주만 반려할 수 있습니다.' } })
    return
  }

  const { id } = req.params
  const ownerId = req.user!.sub

  const { data: attendance } = await supabaseAdmin
    .from('attendance')
    .select('workplace_id')
    .eq('id', id)
    .single()

  if (!attendance) {
    res.status(404).json({ ok: false, error: { message: '근태 기록을 찾을 수 없습니다.' } })
    return
  }

  const { data: workplace } = await supabaseAdmin
    .from('workplaces')
    .select('id')
    .eq('id', attendance.workplace_id)
    .eq('owner_id', ownerId)
    .single()

  if (!workplace) {
    res.status(403).json({ ok: false, error: { message: '해당 사업장의 사업주가 아닙니다.' } })
    return
  }

  const { data, error } = await supabaseAdmin
    .from('attendance')
    .update({ status: 'REJECTED' })
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
