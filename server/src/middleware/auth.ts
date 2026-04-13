/**
 * JWT 인증 미들웨어
 *
 * [보안 수정 내역]
 * ❌ 이전: token.split('.')[1] → atob(base64) decode만 수행
 *    - JWT 서명(Signature)을 전혀 검증하지 않아 누구든 임의 payload를 base64로
 *      인코딩하면 인증을 우회할 수 있었음 (치명적 취약점)
 *
 * ✅ 현재: hono/jwt verify() 사용
 *    - HS256 알고리즘으로 JWT_SECRET과 서명을 검증
 *    - 서명 불일치 · 만료 토큰은 401 반환
 *    - Cloudflare Workers의 Web Crypto API(SubtleCrypto) 기반 동작
 *
 * [Admin 역할 확인 방법]
 *    - Supabase JWT payload의 role 필드는 Supabase 내부 역할(anon/authenticated)이므로
 *      커스텀 role(admin/owner/staff)은 DB에서 직접 조회
 *    - adminMiddleware: Supabase REST API로 users 테이블 role 컬럼 확인
 */

import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'
import type { Bindings } from '../index'

type JWTPayload = {
  sub: string
  email?: string
  exp?: number
  iat?: number
}

export const authMiddleware = createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: '인증 토큰이 필요합니다.' }, 401)
  }

  const token = authHeader.split(' ')[1]

  try {
    // ✅ JWT_SECRET으로 서명 검증 + exp 만료 자동 체크 (HS256 알고리즘)
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256') as JWTPayload

    if (!payload.sub) {
      return c.json({ error: '유효하지 않은 토큰입니다.' }, 401)
    }

    // 검증된 userId와 원본 token을 컨텍스트에 저장
    c.set('userId' as never, payload.sub)
    c.set('accessToken' as never, token)
    await next()
  } catch {
    return c.json({ error: '유효하지 않은 토큰입니다.' }, 401)
  }
})

/**
 * Admin 전용 미들웨어 (authMiddleware 이후 체이닝)
 *
 * Supabase users 테이블에서 role = 'admin' 여부를 DB에서 직접 조회
 * JWT payload 의존 없이 DB 단에서 권한 확인 → 권한 위조 불가
 */
export const adminMiddleware = createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
  const userId = c.get('userId' as never) as string

  if (!userId) {
    return c.json({ error: '인증이 필요합니다.' }, 401)
  }

  try {
    // Supabase REST API로 users 테이블에서 role 조회
    const res = await fetch(
      `${c.env.SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=role`,
      {
        headers: {
          apikey: c.env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${c.get('accessToken' as never)}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!res.ok) {
      return c.json({ error: '권한 확인 실패' }, 403)
    }

    const rows = await res.json() as Array<{ role: string }>

    if (!rows.length || rows[0].role !== 'admin') {
      return c.json({ error: '관리자 권한이 필요합니다.' }, 403)
    }

    await next()
  } catch {
    return c.json({ error: '권한 확인 중 오류가 발생했습니다.' }, 500)
  }
})
