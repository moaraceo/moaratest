'use client'

// Server Component에서 클라이언트 컨텍스트를 사용하기 위한 래퍼
// ⚠️ 'use client'는 Next.js 전용 — React Native 파일에 절대 추가 금지
import { AuthProvider } from '@/contexts/AuthContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
