'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Google OAuth PKCE 코드 교환 처리
// Supabase가 /auth/callback?code=XXX 로 리다이렉트
export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      const { searchParams } = new URL(window.location.href)
      const code = searchParams.get('code')
      const error = searchParams.get('error')

      if (error) {
        console.error('OAuth 오류:', error)
        router.replace('/?error=' + error)
        return
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          console.error('코드 교환 실패:', exchangeError.message)
          router.replace('/?error=exchange_failed')
          return
        }
      }

      router.replace('/dashboard')
    }

    handleCallback()
  }, [router])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
      }}
    >
      <p style={{ color: '#6b7280', fontSize: '16px' }}>로그인 처리 중...</p>
    </div>
  )
}
