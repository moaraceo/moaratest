import Link from 'next/link'

export default function NotFound() {
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
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '48px', fontWeight: '700', color: '#111827' }}>404</h1>
        <p style={{ fontSize: '16px', color: '#6b7280', margin: '16px 0 32px' }}>
          페이지를 찾을 수 없습니다.
        </p>
        <Link
          href="/"
          style={{
            backgroundColor: '#2563eb',
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  )
}
