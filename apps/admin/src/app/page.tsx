'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import styles from './page.module.css'

function LoginContent() {
  const { user, loading, signInWithGoogle } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [signingIn, setSigningIn] = useState(false)

  const errorParam = searchParams.get('error')
  const errorMessage =
    errorParam === 'exchange_failed'
      ? '로그인에 실패했습니다. 다시 시도해 주세요.'
      : errorParam
        ? '오류가 발생했습니다. 다시 시도해 주세요.'
        : null

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard')
    }
  }, [user, loading, router])

  const handleSignIn = async () => {
    setSigningIn(true)
    try {
      await signInWithGoogle()
    } catch {
      setSigningIn(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.center}>
        <p className={styles.text}>로딩 중...</p>
      </div>
    )
  }

  return (
    <div className={styles.center}>
      <div className={styles.card}>
        <h1 className={styles.title}>MOARA 어드민</h1>
        <p className={styles.subtitle}>운영팀 전용 관리 대시보드</p>
        {errorMessage && (
          <p className={styles.error}>{errorMessage}</p>
        )}
        <button
          className={styles.button}
          onClick={handleSignIn}
          disabled={signingIn}
        >
          {signingIn ? '로그인 중...' : 'Google로 로그인'}
        </button>
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className={styles.center}>
        <p className={styles.text}>로딩 중...</p>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
