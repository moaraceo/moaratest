/**
 * Admin 분석 API 라우트
 *
 * 목적: 단순 근태 관리 → 프리랜서 노동 데이터 수집·분석 플랫폼
 *
 * 모든 엔드포인트:
 *   - authMiddleware (JWT 서명 검증)
 *   - adminMiddleware (DB에서 role = 'admin' 확인)
 *   - Supabase service_role 키 사용 → RLS 우회하여 집계 뷰 직접 조회
 *
 * 엔드포인트 목록:
 *   GET /api/admin/summary         — 플랫폼 KPI (사용자 수, 총 근무시간 등)
 *   GET /api/admin/industry        — 업종별 노동 통계
 *   GET /api/admin/region          — 지역별 노동 통계
 *   GET /api/admin/hourly          — 시간대별 출근 분포
 *   GET /api/admin/multi-job       — N잡러 현황
 *   GET /api/admin/users           — 전체 사용자 목록 (페이지네이션)
 *   GET /api/admin/attendance      — 전체 근태 목록 (필터링 + 페이지네이션)
 */

import { Hono } from 'hono'
import type { Bindings } from '../index'
import { authMiddleware, adminMiddleware } from '../middleware/auth'

const app = new Hono<{ Bindings: Bindings }>()

// 모든 admin 라우트에 인증 + 권한 검증 적용
app.use('*', authMiddleware)
app.use('*', adminMiddleware)

// ─── 헬퍼: Supabase REST API 호출 (service_role 키 → RLS 우회) ──────────────
async function supabaseQuery<T = unknown>(
  env: Bindings,
  path: string,
  params?: Record<string, string>
): Promise<{ data: T | null; error: string | null }> {
  const url = new URL(`${env.SUPABASE_URL}/rest/v1/${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  const res = await fetch(url.toString(), {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'count=exact',
    },
  })

  if (!res.ok) {
    const text = await res.text()
    return { data: null, error: text }
  }

  const data = await res.json() as T
  return { data, error: null }
}

// ─── GET /api/admin/summary — 플랫폼 KPI ────────────────────────────────────
app.get('/summary', async (c) => {
  const { data, error } = await supabaseQuery<Array<Record<string, unknown>>>(
    c.env,
    'admin_platform_summary',
    { select: '*' }
  )

  if (error) return c.json({ error }, 500)
  return c.json({ data: data?.[0] ?? {} })
})

// ─── GET /api/admin/industry — 업종별 노동 통계 ─────────────────────────────
app.get('/industry', async (c) => {
  const { data, error } = await supabaseQuery<Array<Record<string, unknown>>>(
    c.env,
    'admin_industry_stats',
    { select: '*' }
  )

  if (error) return c.json({ error }, 500)
  return c.json({ data })
})

// ─── GET /api/admin/region — 지역별 노동 통계 ───────────────────────────────
app.get('/region', async (c) => {
  const { data, error } = await supabaseQuery<Array<Record<string, unknown>>>(
    c.env,
    'admin_region_stats',
    { select: '*' }
  )

  if (error) return c.json({ error }, 500)
  return c.json({ data })
})

// ─── GET /api/admin/hourly — 시간대별 출근 분포 ─────────────────────────────
app.get('/hourly', async (c) => {
  const { data, error } = await supabaseQuery<Array<Record<string, unknown>>>(
    c.env,
    'admin_hourly_distribution',
    { select: '*' }
  )

  if (error) return c.json({ error }, 500)
  return c.json({ data })
})

// ─── GET /api/admin/multi-job — N잡러 현황 ──────────────────────────────────
app.get('/multi-job', async (c) => {
  const limit = c.req.query('limit') ?? '50'
  const offset = c.req.query('offset') ?? '0'

  const { data, error } = await supabaseQuery<Array<Record<string, unknown>>>(
    c.env,
    'admin_multi_job_workers',
    {
      select: 'user_id,job_count,total_work_hours,industries',
      limit,
      offset,
    }
  )

  if (error) return c.json({ error }, 500)
  return c.json({ data })
})

// ─── GET /api/admin/users — 전체 사용자 목록 (페이지네이션) ─────────────────
app.get('/users', async (c) => {
  const limit = c.req.query('limit') ?? '50'
  const offset = c.req.query('offset') ?? '0'
  const role = c.req.query('role')   // 필터: owner | staff | admin

  const params: Record<string, string> = {
    select: 'id,name,role,created_at',
    limit,
    offset,
    order: 'created_at.desc',
  }
  if (role) params['role'] = `eq.${role}`

  const { data, error } = await supabaseQuery<Array<Record<string, unknown>>>(
    c.env,
    'users',
    params
  )

  if (error) return c.json({ error }, 500)
  return c.json({ data })
})

// ─── GET /api/admin/attendance — 전체 근태 목록 ──────────────────────────────
app.get('/attendance', async (c) => {
  const limit = c.req.query('limit') ?? '100'
  const offset = c.req.query('offset') ?? '0'
  const status = c.req.query('status')          // PENDING | CONFIRMED | REJECTED
  const workplaceId = c.req.query('workplace_id')
  const dateFrom = c.req.query('date_from')     // YYYY-MM-DD
  const dateTo = c.req.query('date_to')         // YYYY-MM-DD

  const params: Record<string, string> = {
    select: 'id,user_id,workplace_id,clock_in,clock_out,net_minutes,status,date,confirmed_at',
    limit,
    offset,
    order: 'date.desc,clock_in.desc',
  }
  if (status)      params['status']       = `eq.${status}`
  if (workplaceId) params['workplace_id'] = `eq.${workplaceId}`
  if (dateFrom)    params['date']         = `gte.${dateFrom}`
  if (dateTo)      params['date']         = params['date']
    ? `${params['date']},lte.${dateTo}`
    : `lte.${dateTo}`

  const { data, error } = await supabaseQuery<Array<Record<string, unknown>>>(
    c.env,
    'attendance',
    params
  )

  if (error) return c.json({ error }, 500)
  return c.json({ data })
})

export default app
