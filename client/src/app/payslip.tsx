import { router } from "expo-router";
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
import { CURRENT_MINIMUM_WAGE } from "./constants/minimumWage";
import { useAttendance } from "./store/attendanceStore";
import { useStaff } from "./store/staffStore";
import { formatMoney, formatMonth } from "./utils/format";

export default function PayslipScreen() {
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(3);

  const { staffList } = useStaff();
  const { getConfirmedRecords } = useAttendance();

  // 현재 로그인한 직원 정보 찾기 (지금은 샘플로 "김민지" 기준)
  const currentStaff =
    staffList.find((s) => s.name === "김민지") ?? staffList[0];
  const wage = currentStaff?.hourlyWage ?? CURRENT_MINIMUM_WAGE;

  // 확정된 근태로 급여 계산
  const myConfirmed = getConfirmedRecords().filter(
    (r) => r.staffName === currentStaff?.name,
  );

  const totalMinutes = myConfirmed.reduce(
    (sum, r) => sum + (r.actualWorkMinutes || r.workMinutes || 0),
    0,
  );

  // 기본급
  const basicPay = Math.floor((totalMinutes / 60) * wage);

  // 주휴수당
  const weeklyHours = totalMinutes / 60 / 4;
  const weeklyAllowance =
    weeklyHours >= 15 ? Math.floor((weeklyHours / 40) * 8 * wage) : 0;

  // 연장수당 (초과 근무분)
  const overtimeMinutes = Math.max(0, totalMinutes - 480 * 20);
  const overtimePay = Math.floor((overtimeMinutes / 60) * wage * 0.5);

  // 야간근로수당 (22:00-06:00, 50% 추가)
  const nightMinutes = Math.max(0, totalMinutes - 480 * 20); // 간단히 계산
  const nightPay = Math.floor((nightMinutes / 60) * wage * 0.5);

  // 세전 합계
  const grossPay = basicPay + weeklyAllowance + overtimePay + nightPay;

  const handleSavePDF = () => {
    // TODO: Implement PDF save functionality
    console.log("PDF 저장");
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    console.log("공유하기");
  };

  const goBack = () => {
    router.back();
  };

  const prevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>급여 명세서</Text>
        <View style={styles.monthNavigator}>
          <TouchableOpacity style={styles.monthButton} onPress={prevMonth}>
            <Text style={styles.monthArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthText}>{formatMonth(year, month)}</Text>
          <TouchableOpacity style={styles.monthButton} onPress={nextMonth}>
            <Text style={styles.monthArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Gross Payment Amount Box */}
        <View style={styles.grossPaymentBox}>
          <Text style={styles.grossPaymentLabel}>세전 지급 기준액</Text>
          <Text style={styles.grossPaymentAmount}>{formatMoney(grossPay)}</Text>
          <Text style={styles.grossPaymentStatus}>원 · 확정 완료</Text>
        </View>

        {/* Payment Details Card */}
        <View style={styles.paymentDetailsCard}>
          <Text style={styles.sectionTitle}>지급 항목 내역</Text>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>기본급</Text>
            <Text style={styles.paymentAmount}>{formatMoney(basicPay)}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>주휴수당 ✓</Text>
            <Text style={[styles.paymentAmount, styles.weeklyAllowance]}>
              {formatMoney(weeklyAllowance)}
            </Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>연장근로수당</Text>
            <Text style={styles.paymentAmount}>{formatMoney(overtimePay)}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>야간근로수당</Text>
            <Text style={styles.paymentAmount}>{formatMoney(nightPay)}</Text>
          </View>
          <View style={styles.divider} />

          <View style={[styles.paymentRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>세전 합계</Text>
            <Text style={styles.totalAmount}>{formatMoney(grossPay)}</Text>
          </View>
        </View>

        {/* Work Summary Card */}
        <View style={styles.workSummaryCard}>
          <Text style={styles.sectionTitle}>근무 요약</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>총 근무시간</Text>
            <Text style={styles.summaryValue}>80h 00m</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>시급</Text>
            <Text style={styles.summaryValue}>10,047원</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>주휴수당 기준</Text>
            <Text style={[styles.summaryValue, styles.weeklyCriteria]}>
              주 15h 이상 ✓
            </Text>
          </View>
        </View>

        {/* Legal Disclaimer Box */}
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerTitle}>⚠ 참고사항</Text>
          <Text style={styles.disclaimerText}>
            본 명세서는 세전 기준이며 실제 수령액과 다를 수 있습니다. 세금 관련
            문의는 담당 세무사에게 확인하세요.
          </Text>
        </View>

        {/* Bottom Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSavePDF}>
            <Text style={styles.saveButtonText}>📄 PDF 저장</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>공유하기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <StaffTabBar activeTab="payslip" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  backArrow: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
  },
  headerDate: {
    fontSize: 13,
    color: colors.text2,
    fontFamily: "monospace",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  grossPaymentBox: {
    backgroundColor: colors.primaryDim,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 24,
    ...shadows.card,
  },
  grossPaymentLabel: {
    fontSize: 12,
    color: colors.primary,
    marginBottom: 8,
  },
  grossPaymentAmount: {
    fontSize: 28,
    fontWeight: "600",
    color: colors.text,
    fontFamily: "monospace",
    marginBottom: 4,
  },
  grossPaymentStatus: {
    fontSize: 12,
    color: colors.text2,
  },
  paymentDetailsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...shadows.card,
  },
  workSummaryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...shadows.card,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 16,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  paymentLabel: {
    fontSize: 13,
    color: colors.text2,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    fontFamily: "monospace",
  },
  weeklyAllowance: {
    color: colors.success,
  },
  totalRow: {
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
    fontFamily: "monospace",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.text2,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
    fontFamily: "monospace",
  },
  weeklyCriteria: {
    color: colors.success,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  disclaimerBox: {
    backgroundColor: colors.warnDim,
    borderWidth: 1,
    borderColor: colors.warn,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.warn,
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 11,
    color: colors.text2,
    lineHeight: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 40,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.surface,
  },
  shareButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text2,
  },
  monthNavigator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  monthButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  monthArrow: {
    fontSize: 16,
    color: colors.text2,
    fontWeight: "600",
  },
  monthText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
    fontFamily: "monospace",
    minWidth: 60,
    textAlign: "center",
  },
});
