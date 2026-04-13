/**
 * Admin 대시보드 — 프리랜서 노동 데이터 수집·분석 플랫폼
 *
 * 접근 조건: users.role = 'admin' 인 Moara 운영팀 계정만 진입 가능
 * (RouteHandler에서 role 체크 후 이 화면으로 라우팅)
 *
 * 구성:
 *  1. KPI 요약 카드 (사용자 수, 사업장 수, 총 근무시간, N잡러 수)
 *  2. 업종별 노동 통계 테이블
 *  3. 지역별 노동 통계 테이블
 *  4. 시간대별 출근 분포 바 차트
 *  5. N잡러 현황 목록
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "./store/authStore";
import { supabase } from "../lib/supabase";
import {
  borderRadius,
  colors,
  shadows,
  spacing,
  typography,
} from "../constants/theme";

// ─── 타입 정의 ────────────────────────────────────────────────────────────────
type PlatformSummary = {
  total_users: number;
  total_owners: number;
  total_staff: number;
  total_workplaces: number;
  confirmed_shifts: number;
  total_work_hours: number;
  multi_job_workers: number;
  generated_at: string;
};

type IndustryStat = {
  industry_code: string | null;
  workplace_count: number;
  worker_count: number;
  total_work_hours: number;
  avg_work_hours_per_shift: number;
};

type RegionStat = {
  region_code: string | null;
  workplace_count: number;
  worker_count: number;
  attendance_records: number;
  avg_hourly_wage: number;
};

type HourlyDist = {
  work_start_hour: number;
  shift_count: number;
  avg_hours: number;
};

type MultiJobWorker = {
  user_id: string;
  job_count: number;
  total_work_hours: number;
  industries: string[];
};

// ─── 업종 코드 → 한국어 레이블 ────────────────────────────────────────────────
const INDUSTRY_LABEL: Record<string, string> = {
  F: "음식·외식",
  R: "소매·편의점",
  B: "바·주류",
  C: "카페",
  H: "숙박·호텔",
  L: "물류·배송",
  S: "서비스·기타",
};

// ─── 지역 코드 → 한국어 레이블 ────────────────────────────────────────────────
const REGION_LABEL: Record<string, string> = {
  "11": "서울",
  "26": "부산",
  "27": "대구",
  "28": "인천",
  "29": "광주",
  "30": "대전",
  "31": "울산",
  "36": "세종",
  "41": "경기",
  "42": "강원",
  "43": "충북",
  "44": "충남",
  "45": "전북",
  "46": "전남",
  "47": "경북",
  "48": "경남",
  "50": "제주",
};

// ─── 탭 타입 ──────────────────────────────────────────────────────────────────
type Tab = "summary" | "industry" | "region" | "hourly" | "multijob";

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();
  const { role, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [summary, setSummary] = useState<PlatformSummary | null>(null);
  const [industryStats, setIndustryStats] = useState<IndustryStat[]>([]);
  const [regionStats, setRegionStats] = useState<RegionStat[]>([]);
  const [hourlyDist, setHourlyDist] = useState<HourlyDist[]>([]);
  const [multiJobWorkers, setMultiJobWorkers] = useState<MultiJobWorker[]>([]);

  // admin이 아니면 즉시 리다이렉트
  useEffect(() => {
    if (role !== null && role !== "admin") {
      router.replace("/");
    }
  }, [role]);

  const fetchAll = useCallback(async () => {
    try {
      const [s, i, r, h, m] = await Promise.all([
        supabase.from("admin_platform_summary").select("*").single(),
        supabase.from("admin_industry_stats").select("*"),
        supabase.from("admin_region_stats").select("*"),
        supabase.from("admin_hourly_distribution").select("*"),
        supabase.from("admin_multi_job_workers").select("*").limit(30),
      ]);

      if (s.data) setSummary(s.data as PlatformSummary);
      if (i.data) setIndustryStats(i.data as IndustryStat[]);
      if (r.data) setRegionStats(r.data as RegionStat[]);
      if (h.data) setHourlyDist(h.data as HourlyDist[]);
      if (m.data) setMultiJobWorkers(m.data as MultiJobWorker[]);
    } catch (err) {
      console.error("Admin fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[typography.caption, { marginTop: spacing.sm }]}>
          데이터 불러오는 중…
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Moara Admin</Text>
          <Text style={styles.headerSub}>프리랜서 노동 데이터 플랫폼</Text>
        </View>
        <TouchableOpacity
          onPress={signOut}
          style={styles.signOutBtn}
        >
          <Text style={styles.signOutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      {/* 탭 바 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {(
          [
            { id: "summary", label: "KPI 요약" },
            { id: "industry", label: "업종별" },
            { id: "region", label: "지역별" },
            { id: "hourly", label: "시간대별" },
            { id: "multijob", label: "N잡러" },
          ] as { id: Tab; label: string }[]
        ).map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[
              styles.tab,
              activeTab === tab.id && styles.tabActive,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.id && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── KPI 요약 탭 ─────────────────────────────────────────────────────── */}
      {activeTab === "summary" && summary && (
        <View>
          <Text style={styles.sectionTitle}>플랫폼 전체 현황</Text>
          <View style={styles.kpiGrid}>
            <KpiCard
              label="전체 사용자"
              value={summary.total_users?.toLocaleString() ?? "-"}
              sub={`사장님 ${summary.total_owners} · 직원 ${summary.total_staff}`}
              color={colors.primary}
            />
            <KpiCard
              label="등록 사업장"
              value={summary.total_workplaces?.toLocaleString() ?? "-"}
              sub="누적 사업장 수"
              color={colors.success}
            />
            <KpiCard
              label="총 근무시간"
              value={
                summary.total_work_hours
                  ? `${Number(summary.total_work_hours).toLocaleString()}h`
                  : "-"
              }
              sub="확정된 근태 기준"
              color={colors.warn}
            />
            <KpiCard
              label="N잡러"
              value={summary.multi_job_workers?.toLocaleString() ?? "-"}
              sub="2개 이상 사업장 근무"
              color="#7C3AED"
            />
            <KpiCard
              label="확정 근태"
              value={summary.confirmed_shifts?.toLocaleString() ?? "-"}
              sub="CONFIRMED 건수"
              color="#0891B2"
            />
          </View>
          <Text style={styles.updatedAt}>
            기준 시각: {summary.generated_at
              ? new Date(summary.generated_at).toLocaleString("ko-KR")
              : "-"}
          </Text>
        </View>
      )}

      {/* ── 업종별 탭 ───────────────────────────────────────────────────────── */}
      {activeTab === "industry" && (
        <View>
          <Text style={styles.sectionTitle}>업종별 노동 통계</Text>
          {industryStats.length === 0 ? (
            <EmptyState message="업종 데이터가 없습니다" />
          ) : (
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1.5 }]}>업종</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>사업장</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>근로자</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>총 근무h</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>평균h/회</Text>
              </View>
              {industryStats.map((row, i) => (
                <View
                  key={row.industry_code ?? i}
                  style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}
                >
                  <Text style={[styles.tableCell, { flex: 1.5, fontWeight: "600" }]}>
                    {INDUSTRY_LABEL[row.industry_code ?? ""] ?? row.industry_code ?? "미분류"}
                  </Text>
                  <Text style={styles.tableCell}>{row.workplace_count}</Text>
                  <Text style={styles.tableCell}>{row.worker_count}</Text>
                  <Text style={styles.tableCell}>
                    {row.total_work_hours ? Number(row.total_work_hours).toLocaleString() : "-"}
                  </Text>
                  <Text style={styles.tableCell}>
                    {row.avg_work_hours_per_shift
                      ? Number(row.avg_work_hours_per_shift).toFixed(1)
                      : "-"}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ── 지역별 탭 ───────────────────────────────────────────────────────── */}
      {activeTab === "region" && (
        <View>
          <Text style={styles.sectionTitle}>지역별 노동 통계</Text>
          {regionStats.length === 0 ? (
            <EmptyState message="지역 데이터가 없습니다" />
          ) : (
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 1.2 }]}>지역</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>사업장</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>근로자</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>근태 건수</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>평균 시급</Text>
              </View>
              {regionStats.map((row, i) => (
                <View
                  key={row.region_code ?? i}
                  style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}
                >
                  <Text style={[styles.tableCell, { flex: 1.2, fontWeight: "600" }]}>
                    {REGION_LABEL[row.region_code ?? ""] ?? row.region_code ?? "미분류"}
                  </Text>
                  <Text style={styles.tableCell}>{row.workplace_count}</Text>
                  <Text style={styles.tableCell}>{row.worker_count}</Text>
                  <Text style={styles.tableCell}>{row.attendance_records}</Text>
                  <Text style={styles.tableCell}>
                    {row.avg_hourly_wage
                      ? `${Number(row.avg_hourly_wage).toLocaleString()}원`
                      : "-"}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ── 시간대별 탭 ─────────────────────────────────────────────────────── */}
      {activeTab === "hourly" && (
        <View>
          <Text style={styles.sectionTitle}>시간대별 출근 분포</Text>
          <Text style={styles.sectionDesc}>
            프리랜서 노동 패턴 분석 — 어느 시간대에 가장 많이 일하는가
          </Text>
          {hourlyDist.length === 0 ? (
            <EmptyState message="시간대 데이터가 없습니다" />
          ) : (
            <HourlyBarChart data={hourlyDist} />
          )}
        </View>
      )}

      {/* ── N잡러 탭 ────────────────────────────────────────────────────────── */}
      {activeTab === "multijob" && (
        <View>
          <Text style={styles.sectionTitle}>N잡러 현황</Text>
          <Text style={styles.sectionDesc}>
            2개 이상 사업장에서 근무 중인 프리랜서 (최대 30명)
          </Text>
          {multiJobWorkers.length === 0 ? (
            <EmptyState message="N잡러 데이터가 없습니다" />
          ) : (
            multiJobWorkers.map((worker, i) => (
              <View key={worker.user_id} style={styles.workerCard}>
                <View style={styles.workerRank}>
                  <Text style={styles.workerRankText}>#{i + 1}</Text>
                </View>
                <View style={styles.workerInfo}>
                  <Text style={styles.workerIdText}>
                    {worker.user_id.slice(0, 8)}…
                  </Text>
                  <Text style={styles.workerMeta}>
                    {worker.job_count}개 사업장 ·{" "}
                    {Number(worker.total_work_hours).toFixed(1)}h 누적
                  </Text>
                  {worker.industries?.length > 0 && (
                    <Text style={styles.workerIndustries}>
                      {worker.industries
                        .filter(Boolean)
                        .map((c) => INDUSTRY_LABEL[c] ?? c)
                        .join(" · ")}
                    </Text>
                  )}
                </View>
                <View style={styles.jobCountBadge}>
                  <Text style={styles.jobCountText}>{worker.job_count}잡</Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

// ─── 서브 컴포넌트 ─────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <View style={[styles.kpiCard, shadows.card]}>
      <View style={[styles.kpiColorBar, { backgroundColor: color }]} />
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiSub}>{sub}</Text>
    </View>
  );
}

function HourlyBarChart({ data }: { data: HourlyDist[] }) {
  const maxCount = Math.max(...data.map((d) => d.shift_count), 1);
  const BAR_MAX_HEIGHT = 80;

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartBars}>
        {Array.from({ length: 24 }, (_, h) => {
          const found = data.find((d) => d.work_start_hour === h);
          const count = found?.shift_count ?? 0;
          const height = Math.max(4, (count / maxCount) * BAR_MAX_HEIGHT);
          const isPeak = count === maxCount && count > 0;
          return (
            <View key={h} style={styles.chartBarWrap}>
              <Text style={styles.chartBarCount}>
                {count > 0 ? count : ""}
              </Text>
              <View
                style={[
                  styles.chartBar,
                  {
                    height,
                    backgroundColor: isPeak ? colors.primary : colors.primaryDim,
                  },
                ]}
              />
              <Text style={styles.chartBarLabel}>
                {h % 3 === 0 ? `${h}시` : ""}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.chartNote}>
        * 각 막대: 해당 시간에 출근한 총 근무 건수
      </Text>
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>{message}</Text>
    </View>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg,
  },

  // 헤더
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: colors.text },
  headerSub: { fontSize: 12, color: colors.text2, marginTop: 2 },
  signOutBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.dangerDim,
    borderRadius: borderRadius.sm,
  },
  signOutText: { fontSize: 13, color: colors.danger, fontWeight: "600" },

  // 탭 바
  tabBar: { marginBottom: spacing.md },
  tabBarContent: { gap: spacing.xs },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 13, color: colors.text2, fontWeight: "500" },
  tabTextActive: { color: "#fff" },

  // 섹션 제목
  sectionTitle: { ...typography.h3, marginBottom: spacing.xs },
  sectionDesc: { ...typography.caption, marginBottom: spacing.md },
  updatedAt: { ...typography.small, marginTop: spacing.md, textAlign: "right" },

  // KPI 카드
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  kpiCard: {
    width: "47%",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    overflow: "hidden",
  },
  kpiColorBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  kpiLabel: { fontSize: 12, color: colors.text2, marginTop: spacing.xs },
  kpiValue: { fontSize: 24, fontWeight: "700", marginTop: spacing.xs },
  kpiSub: { fontSize: 11, color: colors.text3, marginTop: 2 },

  // 테이블
  table: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: "hidden",
    ...shadows.card,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  tableHeader: { backgroundColor: colors.primary },
  tableRowAlt: { backgroundColor: colors.bg },
  tableCell: { flex: 1, fontSize: 13, color: colors.text, textAlign: "center" },
  tableHeaderText: { color: "#fff", fontWeight: "600", fontSize: 12 },

  // 시간대 차트
  chartContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.card,
  },
  chartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 120,
    gap: 2,
  },
  chartBarWrap: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  chartBar: { width: "100%", borderRadius: 2 },
  chartBarCount: { fontSize: 8, color: colors.text2, marginBottom: 2 },
  chartBarLabel: { fontSize: 8, color: colors.text3, marginTop: 2 },
  chartNote: { fontSize: 11, color: colors.text3, marginTop: spacing.sm },

  // N잡러 카드
  workerCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: "center",
    ...shadows.card,
  },
  workerRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryDim,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  workerRankText: { fontSize: 12, color: colors.primary, fontWeight: "700" },
  workerInfo: { flex: 1 },
  workerIdText: { fontSize: 13, color: colors.text, fontWeight: "600" },
  workerMeta: { fontSize: 12, color: colors.text2, marginTop: 2 },
  workerIndustries: { fontSize: 11, color: colors.text3, marginTop: 2 },
  jobCountBadge: {
    backgroundColor: "#7C3AED20",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  jobCountText: { fontSize: 13, color: "#7C3AED", fontWeight: "700" },

  // 빈 상태
  emptyState: {
    padding: spacing.xl,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  emptyStateText: { color: colors.text3, fontSize: 14 },
});
