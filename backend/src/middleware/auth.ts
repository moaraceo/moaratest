import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { supabaseAdmin } from '../lib/supabase.js'

export interface AuthPayload {
  sub: string
  phone: string | null
  role: string
  email?: string
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

/**
 * [C-1 수정] OWNER 전용 엔드포인트 미들웨어
 *
 * JWT role만 신뢰하지 않고 DB에서 실제 role을 재확인한다.
 * JWT가 위조/탈취되어 role=owner로 서명된 경우에도 DB가 staff라면 차단한다.
 */
export function requireOwnerRole(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const userId = req.user?.sub
  if (!userId) {
    res.status(401).json({ ok: false, error: { message: '인증이 필요합니다.' } })
    return
  }

  // DB에서 실제 role 확인 (비동기)
  void (async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      if (error || !data) {
        res.status(401).json({ ok: false, error: { message: '사용자 정보를 확인할 수 없습니다.' } })
        return
      }
      if (data.role !== 'owner') {
        res.status(403).json({ ok: false, error: { message: '사업주만 접근할 수 있습니다.' } })
        return
      }
      // DB 검증 통과 — JWT role도 동기화
      req.user!.role = data.role
      next()
    } catch {
      res.status(500).json({ ok: false, error: { message: '인증 확인 중 오류가 발생했습니다.' } })
    }
  })()
}
