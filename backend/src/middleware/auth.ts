import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'

export interface AuthPayload {
  sub: string
  phone: string
  role: string
}

export interface AuthRequest extends Request {
  user?: AuthPayload
}

export function authenticateJwt(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization']

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ ok: false, error: { message: '인증 토큰이 필요합니다.' } })
    return
  }

  const token = authHeader.slice(7)

  try {
    const payload = jwt.verify(token, config.jwt.accessSecret) as AuthPayload
    req.user = payload
    next()
  } catch {
    res.status(401).json({ ok: false, error: { message: '유효하지 않은 토큰입니다.' } })
  }
}
