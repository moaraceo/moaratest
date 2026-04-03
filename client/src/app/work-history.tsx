import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, shadows } from "../constants/theme";
import StaffTabBar from "./components/common/StaffTabBar";
import { useWorkplace } from "./store/workplaceStore";

// ─────────────────────────────────────────────
// 타입 & 유틸
// ─────────────────────────────────────────────
type WorkRecord = {
  id: string;
  fullDate: string;      // "2026.05.08"
  displayDate: string;   // "5/8"
  day: string;           // "(금)"
  clockIn: string;
  clockOut: string;
  workMinutes: number;   // clock-out minus clock-in (휴게 포함)
  breakMinutes: number;
  actualMinutes: number; // workMinutes - breakMinutes
  amount: number;
  status: "PENDING" | "CONFIRMED";
  approvedAt?: string;
  approvedBy?: string;
  memo?: string;
};

function fmtMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

// ─────────────────────────────────────────────
// 샘플 데이터 (2026년 5월)
// ─────────────────────────────────────────────
const SAMPLE_RECORDS: WorkRecord[] = [
  {
    id: "r1",
    fullDate: "2026.05.08",
    displayDate: "5/8",
    day: "(금)",
    clockIn: "10:02",
    clockOut: "16:15",
    workMinutes: 373,
    breakMinutes: 30,
    actualMinutes: 343,
    amount: 61600,
    status: "PENDING",
  },
  {
    id: "r2",
    fullDate: "2026.05.07",
    displayDate: "5/7",
    day: "(목)",
    clockIn: "09:58",
    clockOut: "16:00",
    workMinutes: 362,
    breakMinutes: 30,
    actualMinutes: 332,
    amount: 60300,
    status: "CONFIRMED",
    approvedAt: "2026.05.07 17:12",
    approvedBy: "대표 (홍길동)",
    memo: "홀 담당 근무",
  },
  {
    id: "r3",
    fullDate: "2026.05.06",
    displayDate: "5/6",
    day: "(수)",
    clockIn: "10:00",
    clockOut: "16:00",
    workMinutes: 360,
    breakMinutes: 30,
    actualMinutes: 330,
    amount: 60180,
    status: "CONFIRMED",
    approvedAt: "2026.05.06 18:05",
    approvedBy: "대표 (홍길동)",
    memo: "",
  },
  {
    id: "r4",
    fullDate: "2026.05.05",
    displayDate: "5/5",
    day: "(화)",
    clockIn: "09:55",
    clockOut: "14:30",
    workMinutes: 275,
    breakMinutes: 0,
    actualMinutes: 275,
    amount: 45970,
    status: "CONFIRMED",
    approvedAt: "2026.05.05 15:10",
    approvedBy: "대표 (홍길동)",
    memo: "단축 근무",
  },
  {
    id: "r5",
    fullDate: "2026.05.03",
    displayDate: "5/3",
    day: "(일)",
    clockIn: "10:00",
    clockOut: "18:00",
    workMinutes: 480,
    breakMinutes: 60,
    actualMinutes: 420,
    amount: 70210,
    status: "CONFIRMED",
    approvedAt: "2026.05.03 19:00",
    approvedBy: "대표 (홍길동)",
    memo: "",
  },
];

// ─────────────────────────────────────────────
// 화면
// ─────────────────────────────────────────────
export default function WorkHistoryScreen() {
  const router = useRouter();
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(5);
  const { getCurrentWorkplace } = useWorkplace();
  const currentWorkplace = getCurrentWorkplace();

  const prevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else setMonth((m) => m + 1);
  };

  // 요약 계산 (실제 데이터 기반)
  const totalActualMin = SAMPLE_RECORDS.reduce((s, r) => s + r.actualMinutes, 0);
  const confirmedDays = SAMPLE_RECORDS.filter((r) => r.status === "CONFIRMED").length;
  const pendingDays = SAMPLE_RECORDS.filter((r) => r.status === "PENDING").length;

  const handleRecordPress = (record: WorkRecord) => {
    router.push({
      pathname: "/work-record-detail",
      params: {
        id: record.id,
        fullDate: record.fullDate,
        displayDate: record.displayDate,
        day: record.day,
        clockIn: record.clockIn,
        clockOut: record.clockOut,
        workMinutes: String(record.workMinutes),
        breakMinutes: String(record.breakMinutes),
        actualMinutes: String(record.actualMinutes),
        amount: String(record.amount),
        status: record.status,
        approvedAt: record.approvedAt ?? "",
        approvedBy: record.approvedBy ?? "",
        memo: record.memo ?? "",
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* SafeArea: 상단만 (탭바가 하단 처리) */}
      <SafeAreaView edges={["top", "left", "right"]} style={styles.headerWrapper}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>내 근무 기록</Text>
            <Text style={styles.headerSub}>
              박지수 · {currentWorkplace?.name ?? "OO카페 강남점"}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* 월 네비게이터 */}
        <View style={styles.monthNav}>
          <TouchableOpacity style={styles.monthArrowBtn} onPress={prevMonth}>
            <Text style={styles.monthArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthText}>
            {year}년 {month}월
          </Text>
          <TouchableOpacity style={styles.monthArrowBtn} onPress={nextMonth}>
            <Text style={styles.monthArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 요약 카드 */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>이번 달 총 근무</Text>
            <Text style={styles.summaryValue}>{fmtMin(totalActualMin)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>승인 완료</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {confirmedDays}일
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>승인 대기</Text>
            <Text style={[styles.summaryValue, { color: colors.warn }]}>
              {pendingDays}일
            </Text>
          </View>
        </View>

        {/* 날짜별 기록 */}
        <Text style={styles.sectionTitle}>날짜별 기록</Text>

        {SAMPLE_RECORDS.map((record) => {
          const isPending = record.status === "PENDING";
          return (
            <TouchableOpacity
              key={record.id}
              style={[
                styles.recordCard,
                isPending && styles.recordCardPending,
              ]}
              onPress={() => handleRecordPress(record)}
              activeOpacity={0.75}
            >
              {/* 왼쪽: 날짜 */}
              <View style={styles.dateCol}>
                <Text style={styles.dateNum}>{record.displayDate}</Text>
                <Text style={styles.dateDow}>{record.day}</Text>
              </View>

              {/* 가운데: 시간 정보 */}
              <View style={styles.recordMid}>
                <Text
                  style={[
                    styles.timeRange,
                    isPending ? styles.timeRangePending : styles.timeRangeConfirmed,
                  ]}
                >
                  {record.clockIn} – {record.clockOut}
                </Text>
                <Text style={styles.recordMeta}>
                  {fmtMin(record.workMinutes)} ·{" "}
                  {record.breakMinutes > 0
                    ? `휴게 ${record.breakMinutes}분`
                    : "휴게 없음"}
                </Text>
              </View>

              {/* 오른쪽: 금액 + 뱃지 */}
              <View style={styles.recordRight}>
                <Text style={styles.recordAmount}>
                  {record.amount.toLocaleString()}원
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    isPending ? styles.badgePending : styles.badgeConfirmed,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      isPending
                        ? styles.statusTextPending
                        : styles.statusTextConfirmed,
                    ]}
                  >
                    {isPending ? "승인 대기" : "승인 완료"}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 24 }} />
      </ScrollView>

      <StaffTabBar activeTab="history" />
    </View>
  );
}

// ─────────────────────────────────────────────
// 스타일
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  headerWrapper: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backArrow: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: "600",
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 12,
    color: colors.text2,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 16,
  },
  monthArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  monthArrow: {
    fontSize: 18,
    color: colors.text2,
    fontWeight: "600",
    lineHeight: 22,
  },
  monthText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    minWidth: 90,
    textAlign: "center",
  },
  // 요약 카드
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 4,
    ...shadows.card,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.text2,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  // 섹션 타이틀
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text2,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  // 일별 기록 카드
  recordCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  recordCardPending: {
    backgroundColor: "#FFFBF0",
    borderColor: "#F5E6A3",
  },
  dateCol: {
    width: 36,
    alignItems: "center",
    marginRight: 12,
  },
  dateNum: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  dateDow: {
    fontSize: 11,
    color: colors.text3,
    marginTop: 2,
  },
  recordMid: {
    flex: 1,
    gap: 4,
  },
  timeRange: {
    fontSize: 14,
    fontWeight: "600",
  },
  timeRangeConfirmed: {
    color: colors.primary,
  },
  timeRangePending: {
    color: "#B8860B",
  },
  recordMeta: {
    fontSize: 12,
    color: colors.text2,
  },
  recordRight: {
    alignItems: "flex-end",
    gap: 6,
    marginLeft: 8,
  },
  recordAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeConfirmed: {
    backgroundColor: colors.successDim,
  },
  badgePending: {
    backgroundColor: "#FEF3C7",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusTextConfirmed: {
    color: colors.success,
  },
  statusTextPending: {
    color: "#92400E",
  },
});
