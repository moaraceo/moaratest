import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
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
import { useAuth } from "./store/authStore";
import { useAttendance } from "./store/attendanceStore";
import { usePayrollSettings } from "./store/payrollSettingsStore";
import { useWorkplace } from "./store/workplaceStore";
import { calcMonthlyPayroll, type DailyAttendance } from "./utils/payroll";

// ─────────────────────────────────────────────
// 뱃지 컴포넌트
// ─────────────────────────────────────────────
function Badge({
  label,
  color,
  bg,
}: {
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <View style={[badgeStyles.wrap, { backgroundColor: bg }]}>
      <Text style={[badgeStyles.text, { color }]}>{label}</Text>
    </View>
  );
}
const badgeStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    marginLeft: 6,
  },
  text: { fontSize: 11, fontWeight: "600" },
});

// ─────────────────────────────────────────────
// 화면
// ─────────────────────────────────────────────
export default function PayslipScreen() {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { user } = useAuth();
  const { records } = useAttendance();
  const { getCurrentWorkplace } = useWorkplace();
  const { getSettings } = usePayrollSettings();
  const currentWorkplace = getCurrentWorkplace();

  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  };

  // ── 실데이터 급여 계산 ──────────────────────────
  const yearMonth = `${year}-${String(month).padStart(2, "0")}`;
  const settings = useMemo(
    () => getSettings(currentWorkplace?.id ?? ""),
    [getSettings, currentWorkplace?.id],
  );

  // 해당 월 레코드 필터 (REJECTED 제외, clockOut 있는 것만)
  const monthRecords = useMemo(() => {
    return records.filter((r) => {
      if (r.status === "REJECTED" || !r.clockOut) return false;
      // date: "YYYY.MM.DD" → "YYYY-MM"
      const ym = r.date.replace(/\./g, "-").substring(0, 7);
      return ym === yearMonth;
    });
  }, [records, yearMonth]);

  const confirmedRecords = useMemo(
    () => monthRecords.filter((r) => r.status === "CONFIRMED"),
    [monthRecords],
  );
  const pendingRecords = useMemo(
    () => monthRecords.filter((r) => r.status === "PENDING"),
    [monthRecords],
  );

  // AttendanceRecord → DailyAttendance 변환
  const toDailyAttendance = (r: typeof records[number]): DailyAttendance => ({
    date: r.date.replace(/\./g, "-"),   // "YYYY.MM.DD" → "YYYY-MM-DD"
    clockIn: r.clockIn,
    clockOut: r.clockOut!,
    breakMinutes: r.breakMinutes,
  });

  const confirmedPayroll = useMemo(
    () => confirmedRecords.length > 0
      ? calcMonthlyPayroll(confirmedRecords.map(toDailyAttendance), settings, yearMonth)
      : null,
    [confirmedRecords, settings, yearMonth],
  );
  const pendingPayroll = useMemo(
    () => pendingRecords.length > 0
      ? calcMonthlyPayroll(pendingRecords.map(toDailyAttendance), settings, yearMonth)
      : null,
    [pendingRecords, settings, yearMonth],
  );

  const hourlyWage = settings.hourlyRate;
  const basicPay         = confirmedPayroll?.totalBaseWage ?? 0;
  const weeklyAllowance  = confirmedPayroll?.totalWeeklyHolidayPay ?? 0;
  const overtimePay      = (confirmedPayroll?.totalOvertimeWage ?? 0) + (confirmedPayroll?.totalNightWage ?? 0);
  const holidayWage      = confirmedPayroll?.totalHolidayWage ?? 0;
  const confirmedTotal   = confirmedPayroll?.grandTotal ?? 0;
  const pendingPay       = pendingPayroll?.grandTotal ?? 0;
  const estimatedTotal   = confirmedTotal + pendingPay;
  const pendingCount     = pendingRecords.length;

  // 총 근무시간 포맷
  const totalNetMinutes = confirmedPayroll?.totalNetMinutes ?? 0;
  const totalHours = `${Math.floor(totalNetMinutes / 60)}시간 ${String(totalNetMinutes % 60).padStart(2, "0")}분`;

  // 전월 확정 급여
  const prevYearMonth = month === 1
    ? `${year - 1}-12`
    : `${year}-${String(month - 1).padStart(2, "0")}`;
  const prevMonthRecords = useMemo(
    () => records.filter((r) => {
      if (r.status !== "CONFIRMED" || !r.clockOut) return false;
      const ym = r.date.replace(/\./g, "-").substring(0, 7);
      return ym === prevYearMonth;
    }),
    [records, prevYearMonth],
  );
  const prevMonthPayroll = useMemo(
    () => prevMonthRecords.length > 0
      ? calcMonthlyPayroll(prevMonthRecords.map(toDailyAttendance), settings, prevYearMonth)
      : null,
    [prevMonthRecords, settings, prevYearMonth],
  );
  const prevMonthFinal = prevMonthPayroll?.grandTotal ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* ─── 헤더 ─── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>내 급여</Text>
          <Text style={styles.headerSub}>
            {user?.name ?? "-"} · {currentWorkplace?.name ?? "-"}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* ─── 월 네비게이터 ─── */}
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ─── 요약 행 ─── */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>이번 달 총 근무</Text>
            <Text style={styles.summaryValue}>{totalHours}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>시급</Text>
            <Text style={styles.summaryValue}>
              {hourlyWage.toLocaleString()}원
            </Text>
          </View>
        </View>

        {/* ─── 예상 급여 박스 ─── */}
        <View style={styles.estimatedBox}>
          <Text style={styles.estimatedLabel}>예상 급여</Text>
          <Text style={styles.estimatedAmount}>
            {estimatedTotal.toLocaleString()}원
          </Text>
        </View>

        {/* ─── 미승인 경고 배너 ─── */}
        {pendingCount > 0 && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              {pendingCount}건 미승인 포함 — 대표 승인 후 확정돼요
            </Text>
          </View>
        )}

        {/* ─── 급여 상세 내역 ─── */}
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>급여 상세 내역</Text>

          {/* 기본급 */}
          <View style={styles.detailRow}>
            <View style={styles.detailLabelRow}>
              <Text style={styles.detailLabel}>기본급</Text>
              <Badge
                label="확정"
                color={colors.success}
                bg={colors.successDim}
              />
            </View>
            <Text style={styles.detailValue}>
              {basicPay.toLocaleString()}원
            </Text>
          </View>
          <View style={styles.divider} />

          {/* 주휴수당 */}
          <View style={styles.detailRow}>
            <View style={styles.detailLabelRow}>
              <Text style={styles.detailLabel}>주휴수당</Text>
              <Badge
                label="자동계산"
                color={colors.primary}
                bg={colors.primaryDim}
              />
            </View>
            <Text style={styles.detailValue}>
              {weeklyAllowance.toLocaleString()}원
            </Text>
          </View>
          <View style={styles.divider} />

          {/* 연장/야간수당 */}
          <View style={styles.detailRow}>
            <View style={styles.detailLabelRow}>
              <Text style={styles.detailLabel}>연장·야간수당</Text>
              <Badge label="초과근무" color={colors.warn} bg={colors.warnDim} />
            </View>
            <Text style={styles.detailValue}>
              {overtimePay.toLocaleString()}원
            </Text>
          </View>

          {/* 근로자의 날 가산수당 (해당 월에 5/1이 포함된 경우만) */}
          {holidayWage > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <View style={styles.detailLabelRow}>
                  <Text style={styles.detailLabel}>근로자의 날 가산</Text>
                  <Badge label="5/1" color={colors.primary} bg={colors.primaryDim} />
                </View>
                <Text style={styles.detailValue}>
                  {holidayWage.toLocaleString()}원
                </Text>
              </View>
            </>
          )}

          {/* 예상 합계 구분선 */}
          <View style={styles.totalDivider} />

          {/* 예상 합계 */}
          <View style={styles.detailRow}>
            <Text style={styles.totalLabel}>예상 합계</Text>
            <Text style={styles.totalValue}>
              {confirmedTotal.toLocaleString()}원
            </Text>
          </View>
          <View style={styles.divider} />

          {/* 미승인 근무 */}
          <View style={styles.detailRow}>
            <View style={styles.detailLabelRow}>
              <Text style={styles.detailLabel}>미승인 근무 (3/8)</Text>
              <Badge label="대기중" color="#92400E" bg="#FEF3C7" />
            </View>
            <Text style={styles.pendingValue}>
              +{pendingPay.toLocaleString()}원
            </Text>
          </View>
          <View style={styles.divider} />

          {/* 전월 확정 급여 */}
          <View style={[styles.detailRow, { paddingBottom: 4 }]}>
            <Text style={styles.detailLabel}>
              전월 ({month === 1 ? 12 : month - 1}월) 확정 급여
            </Text>
            <Text style={styles.detailValue}>
              {prevMonthFinal.toLocaleString()}원
            </Text>
          </View>
        </View>
      </ScrollView>

      <StaffTabBar activeTab="payslip" />
    </SafeAreaView>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
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
  // 월 네비게이터
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  // 요약 행
  summaryRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: 14,
    ...shadows.card,
  },
  summaryItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.text2,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  // 예상 급여 박스
  estimatedBox: {
    backgroundColor: colors.primaryDim,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    ...shadows.card,
  },
  estimatedLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.primary,
  },
  estimatedAmount: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
  },
  // 경고 배너
  warningBanner: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 13,
    color: "#92400E",
    fontWeight: "500",
  },
  // 급여 상세 카드
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingVertical: 4,
    ...shadows.card,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text2,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
  },
  detailLabelRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 14,
    color: colors.text2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  pendingValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#B45309",
  },
  totalDivider: {
    height: 1.5,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
});
