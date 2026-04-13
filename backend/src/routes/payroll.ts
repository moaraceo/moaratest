import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase.js'
import { authenticateJwt, type AuthRequest } from '../middleware/auth.js'

const router = Router()
router.use(authenticateJwt)

function calcPayroll(netMinutes: number, hourlyWage: number) {
  const hours = netMinutes / 60
  const basePay = Math.round(hours * hourlyWage)
  const nationalPension = Math.round(basePay * 0.045)
  const healthInsurance = Math.round(basePay * 0.03545)
  const employmentInsurance = Math.round(basePay * 0.009)
  let incomeTax = 0
  if (basePay <= 3_000_000) incomeTax = Math.round(basePay * 0.05)
  else if (basePay <= 4_500_000) incomeTax = Math.round(basePay * 0.08)
  else incomeTax = Math.round(basePay * 0.1)
  const totalDeductions = nationalPension + healthInsurance + employmentInsurance + incomeTax
  return {
    workHours: Math.round(hours * 10) / 10,
    basePay,
    deductions: { nationalPension, healthInsurance, employmentInsurance, incomeTax, total: totalDeductions },
    netPay: basePay - totalDeductions,
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
