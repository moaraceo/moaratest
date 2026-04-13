'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000'

type PlatformSummary = {
  total_users: number
  total_owners: number
  total_staff: number
  total_workplaces: number
  confirmed_shifts: number
  total_work_hours: number
  multi_job_workers: number
  generated_at: string
}

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [summary, setSummary] = useState<PlatformSummary | null>(null)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    fetchSummary()
  }, [user])

  const fetchSummary = async () => {
    setFetching(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? ''
      const res = await fetch(`${API_URL}/api/admin/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const body = await res.json() as { data: PlatformSummary }
        setSummary(body.data)
      }
    } catch {
      // 조용히 실패
    } finally {
      setFetching(false)
    }
  }

  if (loading) {
    return <div style={styles.center}><p style={styles.muted}>로딩 중...</p></div>
  }

  if (!user) return null

  const kpis = summary ? [
    { label: '전체 사용자', value: summary.total_users?.toLocaleString() ?? '-' },
    { label: '사장님', value: summary.total_owners?.toLocaleString() ?? '-' },
    { label: '직원', value: summary.total_staff?.toLocaleString() ?? '-' },
    { label: '사업장', value: summary.total_workplaces?.toLocaleString() ?? '-' },
    { label: '확정 근무', value: summary.confirmed_shifts?.toLocaleString() ?? '-' },
    { label: '총 근무시간', value: `${summary.total_work_hours?.toLocaleString() ?? '-'}h` },
    { label: 'N잡러', value: summary.multi_job_workers?.toLocaleString() ?? '-' },
  ] : []

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>MOARA 어드민</h1>
        <div style={styles.headerRight}>
          <span style={styles.email}>{user.email}</span>
          <button style={styles.signOutBtn} onClick={signOut}>
            로그아웃
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <h2 style={styles.sectionTitle}>플랫폼 현황</h2>

        {fetching ? (
          <p style={styles.muted}>데이터 로딩 중...</p>
        ) : summary ? (
          <div style={styles.grid}>
            {kpis.map((kpi) => (
              <div key={kpi.label} style={styles.kpiCard}>
                <p style={styles.kpiLabel}>{kpi.label}</p>
                <p style={styles.kpiValue}>{kpi.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.emptyCard}>
            <p style={styles.muted}>
              데이터를 불러올 수 없습니다.
            </p>
            <p style={styles.hint}>
              백엔드 서버가 실행 중인지 확인하세요: <code>{API_URL}</code>
            </p>
          </div>
        )}

        <p style={{ ...styles.muted, marginTop: '32px', fontSize: '12px' }}>
          마지막 갱신: {summary?.generated_at ? new Date(summary.generated_at).toLocaleString('ko-KR') : '-'}
        </p>
      </main>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', backgroundColor: '#f9fafb' },
  header: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    padding: '16px 32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: '20px', fontWeight: '700', color: '#111827' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  email: { fontSize: '14px', color: '#6b7280' },
  signOutBtn: {
    backgroundColor: 'transparent',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
  },
  main: { padding: '40px 32px' },
  sectionTitle: { fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '24px' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  kpiCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '24px 20px',
    textAlign: 'center',
  },
  kpiLabel: { fontSize: '13px', color: '#6b7280', marginBottom: '8px' },
  kpiValue: { fontSize: '28px', fontWeight: '700', color: '#2563eb' },
  emptyCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '40px',
    textAlign: 'center',
  },
  muted: { color: '#6b7280', fontSize: '14px' },
  hint: { color: '#9ca3af', fontSize: '12px', marginTop: '8px' },
  center: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}
