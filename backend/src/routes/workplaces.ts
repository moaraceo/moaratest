import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { authenticateJwt, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(authenticateJwt)

// 6자리 초대 코드 생성 (O, I, 0, 1 제외)
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function randomCode(len = 6): string {
  let code = ''
  for (let i = 0; i < len; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)]
  return code
}
function makeExpiry() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
}

// GET /workplaces — 내 사업장 목록 (사장: 소유 사업장, 직원: 소속 사업장)
router.get('/', async (req: AuthRequest, res) => {
  const userId = req.user!.sub
  const role = req.user!.role

  if (role === 'owner') {
    const { data, error } = await supabaseAdmin
      .from('workplaces')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at')

    if (error) { res.status(500).json({ ok: false, error: { message: error.message } }); return }
    res.json({ ok: true, data: data ?? [] })
  } else {
    // 직원: user_workplaces 통해 소속 사업장 조회
    const { data, error } = await supabaseAdmin
      .from('user_workplaces')
      .select('workplace_id, workplaces(*)')
      .eq('user_id', userId)
      .neq('status', 'resigned')

    if (error) { res.status(500).json({ ok: false, error: { message: error.message } }); return }
    const workplaces = (data ?? []).map((r: any) => r.workplaces).filter(Boolean)
    res.json({ ok: true, data: workplaces })
  }
})

// POST /workplaces — 새 사업장 등록 (OWNER 전용)
router.post('/', async (req: AuthRequest, res) => {
  if (req.user!.role !== 'owner') {
    res.status(403).json({ ok: false, error: { message: '사업주만 사업장을 등록할 수 있습니다.' } })
    return
  }

  const { name, address, industry_code, gps_lat, gps_lng } = req.body as {
    name: string
    address?: string
    industry_code?: string
    gps_lat?: number
    gps_lng?: number
  }

  if (!name) {
    res.status(400).json({ ok: false, error: { message: '사업장 이름이 필요합니다.' } })
    return
  }

  const { data, error } = await supabaseAdmin
    .from('workplaces')
    .insert({
      name,
      address: address ?? null,
      owner_id: req.user!.sub,
      invite_code: randomCode(),
      invite_code_expiry: makeExpiry(),
      industry_code: industry_code ?? null,
      gps_lat: gps_lat ?? null,
      gps_lng: gps_lng ?? null,
    })
    .select()
    .single()

  if (error) { res.status(500).json({ ok: false, error: { message: error.message } }); return }
  res.status(201).json({ ok: true, data })
})

// PATCH /workplaces/:id — 사업장 정보 수정 (소유자 전용)
router.patch('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params
  const { name, address, industry_code } = req.body as Partial<{
    name: string; address: string; industry_code: string
  }>

  const { data, error } = await supabaseAdmin
    .from('workplaces')
    .update({ name, address, industry_code })
    .eq('id', id)
    .eq('owner_id', req.user!.sub)
    .select()
    .single()

  if (error) { res.status(500).json({ ok: false, error: { message: error.message } }); return }
  if (!data) { res.status(403).json({ ok: false, error: { message: '권한이 없거나 사업장을 찾을 수 없습니다.' } }); return }
  res.json({ ok: true, data })
})

// POST /workplaces/:id/invite-code — 초대 코드 재발급
router.post('/:id/invite-code', async (req: AuthRequest, res) => {
  const { id } = req.params

  const { data, error } = await supabaseAdmin
    .from('workplaces')
    .update({ invite_code: randomCode(), invite_code_expiry: makeExpiry() })
    .eq('id', id)
    .eq('owner_id', req.user!.sub)
    .select('invite_code, invite_code_expiry')
    .single()

  if (error) { res.status(500).json({ ok: false, error: { message: error.message } }); return }
  if (!data) { res.status(403).json({ ok: false, error: { message: '권한이 없습니다.' } }); return }
  res.json({ ok: true, data })
})

// POST /workplaces/join — 초대 코드로 사업장 참여 (STAFF 전용)
router.post('/join', async (req: AuthRequest, res) => {
  const { invite_code } = req.body as { invite_code: string }
  const userId = req.user!.sub

  if (!invite_code) {
    res.status(400).json({ ok: false, error: { message: '초대 코드가 필요합니다.' } })
    return
  }

  // 코드 검증
  const { data: workplace } = await supabaseAdmin
    .from('workplaces')
    .select('id, name, invite_code_expiry')
    .eq('invite_code', invite_code.toUpperCase().trim())
    .single()

  if (!workplace) {
    res.status(400).json({ ok: false, error: { message: '유효하지 않은 초대 코드예요.' } })
    return
  }
  if (new Date(workplace.invite_code_expiry) < new Date()) {
    res.status(400).json({ ok: false, error: { message: '초대 코드가 만료됐어요. 사장님께 새 코드를 요청해주세요.' } })
    return
  }

  // 이미 소속된 경우 중복 처리
  const { data: existing } = await supabaseAdmin
    .from('user_workplaces')
    .select('id, status')
    .eq('user_id', userId)
    .eq('workplace_id', workplace.id)
    .single()

  if (existing) {
    if (existing.status !== 'resigned') {
      res.json({ ok: true, data: { workplace, already_member: true } })
      return
    }
    // 재입사 처리
    await supabaseAdmin
      .from('user_workplaces')
      .update({ status: 'active', rejoin_date: new Date().toISOString().split('T')[0] })
      .eq('id', existing.id)
  } else {
    // 신규 참여
    await supabaseAdmin.from('user_workplaces').insert({
      user_id: userId,
      workplace_id: workplace.id,
      hourly_wage: 10320, // 최저임금 기본값 — 사장님이 이후 수정
      status: 'active',
      join_date: new Date().toISOString().split('T')[0],
    })
  }

  res.json({ ok: true, data: { workplace, already_member: false } })
})

// GET /workplaces/:id/staff — 사업장 직원 목록 (OWNER 전용)
router.get('/:id/staff', async (req: AuthRequest, res) => {
  if (req.user!.role !== 'owner') {
    res.status(403).json({ ok: false, error: { message: '사업주만 조회할 수 있습니다.' } })
    return
  }

  const { id } = req.params

  // 소유권 확인
  const { data: wp } = await supabaseAdmin
    .from('workplaces')
    .select('id')
    .eq('id', id)
    .eq('owner_id', req.user!.sub)
    .single()

  if (!wp) {
    res.status(403).json({ ok: false, error: { message: '해당 사업장의 사업주가 아닙니다.' } })
    return
  }

  const { data, error } = await supabaseAdmin
    .from('user_workplaces')
    .select('*, users(id, name, phone)')
    .eq('workplace_id', id)
    .order('created_at')

  if (error) { res.status(500).json({ ok: false, error: { message: error.message } }); return }
  res.json({ ok: true, data: data ?? [] })
})

// PATCH /workplaces/:id/staff/:userId — 직원 정보 수정 (시급·직책·상태)
router.patch('/:id/staff/:staffUserId', async (req: AuthRequest, res) => {
  if (req.user!.role !== 'owner') {
    res.status(403).json({ ok: false, error: { message: '사업주만 수정할 수 있습니다.' } })
    return
  }

  const { id, staffUserId } = req.params

  // [H-2 수정] JWT role만 확인하지 않고 실제 사업장 소유권 검증
  const { data: workplace, error: wpErr } = await supabaseAdmin
    .from('workplaces')
    .select('id')
    .eq('id', id)
    .eq('owner_id', req.user!.sub)
    .maybeSingle()

  if (wpErr || !workplace) {
    res.status(403).json({ ok: false, error: { message: '해당 사업장에 대한 권한이 없습니다.' } })
    return
  }

  const { hourly_wage, position, status } = req.body as Partial<{
    hourly_wage: number; position: string; status: string
  }>

  const updates: Record<string, unknown> = {}
  if (hourly_wage !== undefined) updates.hourly_wage = hourly_wage
  if (position !== undefined) updates.position = position
  if (status === 'resigned') {
    updates.status = 'resigned'
    updates.resign_date = new Date().toISOString().split('T')[0]
  } else if (status) {
    updates.status = status
  }

  const { data, error } = await supabaseAdmin
    .from('user_workplaces')
    .update(updates)
    .eq('user_id', staffUserId)
    .eq('workplace_id', id)
    .select()
    .single()

  if (error) { res.status(500).json({ ok: false, error: { message: error.message } }); return }
  res.json({ ok: true, data })
})

export default router
