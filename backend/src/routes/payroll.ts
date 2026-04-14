import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { authenticateJwt, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(authenticateJwt)

// ─────────────────────────────────────────────────────────────
// 주의사항
//  - Math.floor 외 반올림 함수(Math.round, Math.ceil) 사용 금지
//  - 세금 공제 계산 금지 (소득세·고용보험·국민연금 등)
//  - 모든 금액은 세전(稅前) 기준
// ─────────────────────────────────────────────────────────────

function calcPayroll(netMinutes: number, hourlyWage: number) {
  const workHours = Math.floor(netMinutes / 60 * 10) / 10
  const basePay = Math.floor((netMinutes / 60) * hourlyWage)
  return {
    workHours,
    basePay,
    totalWage: basePay, // 세전 합계 (세금 공제 없음)
  }
}

// GET /payroll/summary?workplace_id=&year=&month=
router.get('/summary', async (req: AuthRequest, res) => {
  const userId = req.user!.sub
  const { workplace_id, year, month } = req.query as Record<string, string>

  if (!workplace_id || !year || !month) {
    res.status(400).json({ ok: false, error: { message: 'workplace_id, year, month가 필요합니다.' } })
    return
  }

  const dateFrom = `${year}-${month.padStart(2, '0')}-01`
  const dateTo   = `${year}-${month.padStart(2, '0')}-31`

  const [attendanceRes, wageRes] = await Promise.all([
    supabaseAdmin
      .from('attendance')
      .select('net_minutes')
      .eq('user_id', userId)
      .eq('workplace_id', workplace_id)
      .eq('status', 'CONFIRMED')
      .gte('date', dateFrom)
      .lte('date', dateTo),
    supabaseAdmin
      .from('user_workplaces')
      .select('hourly_wage')
      .eq('user_id', userId)
      .eq('workplace_id', workplace_id)
      .single(),
  ])

  if (attendanceRes.error) {
    res.status(500).json({ ok: false, error: { message: attendanceRes.error.message } })
    return
  }

  const totalMinutes = (attendanceRes.data ?? []).reduce((sum, r) => sum + (r.net_minutes ?? 0), 0)
  const hourlyWage = wageRes.data?.hourly_wage ?? 10320

  res.json({ ok: true, data: calcPayroll(totalMinutes, hourlyWage) })
})

export default router
