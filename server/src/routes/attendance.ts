import { Hono } from 'hono'
import type { Bindings } from '../index'

const app = new Hono<{ Bindings: Bindings }>()

// GET /api/attendance
app.get('/', async (c) => {
  return c.json({ message: '근태 목록 조회 엔드포인트' })
})

// POST /api/attendance
app.post('/', async (c) => {
  return c.json({ message: '근태 기록 생성 엔드포인트' })
})

// GET /api/attendance/:id
app.get('/:id', async (c) => {
  const id = c.req.param('id')
  return c.json({ message: `근태 상세 조회 엔드포인트 (ID: ${id})` })
})

export default app
