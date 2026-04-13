import { Hono } from 'hono'
import type { Bindings } from '../index'

const app = new Hono<{ Bindings: Bindings }>()

// POST /api/auth/login
app.post('/login', async (c) => {
  return c.json({ message: '로그인 엔드포인트' })
})

// POST /api/auth/register
app.post('/register', async (c) => {
  return c.json({ message: '회원가입 엔드포인트' })
})

export default app
