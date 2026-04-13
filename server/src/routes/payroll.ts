import { Hono } from 'hono'
import type { Bindings } from '../index'

const app = new Hono<{ Bindings: Bindings }>()

// GET /api/payroll
app.get('/', async (c) => {
  return c.json({ message: '급여 목록 조회 엔드포인트' })
})

// POST /api/payroll/calculate
app.post('/calculate', async (c) => {
  return c.json({ message: '급여 계산 엔드포인트' })
})

// GET /api/payroll/:id
app.get('/:id', async (c) => {
  const id = c.req.param('id')
  return c.json({ message: `급여 상세 조회 엔드포인트 (ID: ${id})` })
})

export default app
