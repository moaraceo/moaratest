import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { colors, shadows } from "../constants/theme";
import { CURRENT_MINIMUM_WAGE } from "./constants/minimumWage";
import { useAttendance } from "./store/attendanceStore";
import { useStaff } from "./store/staffStore";
import { formatMinutes, formatMoney, formatMonth } from "./utils/format";

export default function PayrollDetailScreen() {
  const { staffId, staffName, hourlyWage } = useLocalSearchParams<{
    staffId?: string;
    staffName?: string;
    hourlyWage?: string;
  }>();

  const wage = Number(hourlyWage) || CURRENT_MINIMUM_WAGE;
  const { staffList } = useStaff();
  const { getConfirmedRecords } = useAttendance();
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(3);

  // Find staff member: try by ID first, then fall back to name
  const staffMember =
    staffList.find((s) => s.id === staffId) ??
    staffList.find((s) => s.name === staffName);

  // Filter attendance records for this staff (staffMember.name이 확정된 후 사용)
  const resolvedName = staffMember?.name ?? staffName;
  const staffRecords = getConfirmedRecords().filter(
    (r) => r.staffName === resolvedName,
  );

  // Calculate payroll data
  const totalWorkMinutes = staffRecords.reduce(
    (sum, r) => sum + (r.actualWorkMinutes || r.workMinutes || 0),
    0,
  );

  // 샘플 데이터 (staffRecords가 비었을 때)
  const sampleWorkMinutes =
    staffRecords.length === 0 ? 480 * 20 : totalWorkMinutes; // 월 20일 × 8시간

  // 기본급 계산
  const basicPay = Math.floor((sampleWorkMinutes / 60) * wage);

  // 주간 근무시간 계산 (주휴수당용)
  const weeklyMinutes = sampleWorkMinutes / 4; // 월 4주 기준
  const weeklyHours = weeklyMinutes / 60;

  // 주휴수당 계산
  const weeklyAllowance =
    weeklyHours >= 15 ? Math.floor((weeklyHours / 40) * 8 * wage) : 0;

  // 연장수당 (샘플: 기본근무 초과분)
  const overtimePay = Math.floor(
    (Math.max(0, sampleWorkMinutes - 480 * 20) / 60) * wage * 0.5,
  );

  // 세전 합계
  const grossPay = basicPay + weeklyAllowance + overtimePay;

  const handleSavePDF = () => {
    Alert.alert("PDF 저장", "명세서 PDF가 저장되었습니다.");
  };

  const handleShare = () => {
    Alert.alert("공유", "명세서가 공유되었습니다.");
  };

  const navigateToAttendanceDetail = () => {
    router.push("/attendance-detail");
  };

  const goBack = () => {
    router.back();
  };

  const prevMonth = () => {
    if (month === 1) {
      setYear((y: number) => y - 1);
      setMonth(12);
    } else {
      setMonth((m: number) => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setYear((y: number) => y + 1);
      setMonth(1);
    } else {
      setMonth((m: number) => m + 1);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {staffMember?.name || staffName || "직원"} · 급여 명세서
        </Text>
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
        {staffRecords.length === 0 ? (
          <>
            {/* Employee Info Card */}
            <View style={styles.employeeInfoCard}>
              <View style={styles.employeeHeader}>
                <View style={styles.largeAvatar}>
                  <Text style={styles.largeAvatarText}>
                    {staffMember?.initial || "?"}
                  </Text>
                </View>
                <View style={styles.employeeDetails}>
                  <Text style={styles.employeeName}>
                    {staffMember?.name || staffName || "직원"}
                  </Text>
                  <Text style={styles.employeePosition}>
                    {staffMember?.position || "직책"}
                  </Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>재직중</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Gross Payment Amount Box */}
            <View style={styles.grossPaymentBox}>
              <Text style={styles.grossPaymentLabel}>세전 지급 기준액</Text>
              <View style={styles.grossAmountContainer}>
                <Text style={styles.grossPaymentAmount}>
                  {formatMoney(grossPay)}
                </Text>
                <Text style={styles.grossPaymentUnit}>원</Text>
              </View>
              <View style={styles.completionBadge}>
                <Text style={styles.completionBadgeText}>확정 완료</Text>
              </View>
            </View>

            {/* Payment Details Card */}
            <View style={styles.paymentDetailsCard}>
              <Text style={styles.sectionTitle}>지급 항목 내역</Text>

              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>기본급</Text>
                <Text style={styles.paymentAmount}>
                  {formatMoney(basicPay)}
                </Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>주휴수당 ✓</Text>
                <Text style={[styles.paymentAmount, styles.weeklyAllowance]}>
                  {formatMoney(weeklyAllowance)}
                </Text>
              </View>
              <View style={styles.divider} />

              <View style={[styles.paymentRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>세전 합계</Text>
                <Text style={styles.totalAmount}>{formatMoney(grossPay)}</Text>
              </View>
            </View>

            {/* Work Summary Card */}
            <TouchableOpacity
              style={styles.workSummaryCard}
              onPress={navigateToAttendanceDetail}
            >
              <View style={styles.workSummaryHeader}>
                <Text style={styles.sectionTitle}>근무 요약</Text>
                <Text style={styles.detailLink}>상세보기 &gt;</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>총 근무시간</Text>
                <Text style={styles.summaryValue}>
                  {formatMinutes(sampleWorkMinutes)}
                </Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>시급</Text>
                <Text style={styles.summaryValue}>{formatMoney(wage)}원</Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>주휴수당 기준</Text>
                <Text style={[styles.summaryValue, styles.weeklyCriteria]}>
                  {weeklyHours >= 15 ? "주 15h 이상 ✓" : "주 15h 미충족"}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Bottom Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSavePDF}
              >
                <Text style={styles.saveButtonText}>📄 PDF 저장</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShare}
              >
                <Text style={styles.shareButtonText}>공유하기</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {/* Employee Info Card */}
            <View style={styles.employeeInfoCard}>
              <View style={styles.employeeHeader}>
                <View style={styles.largeAvatar}>
                  <Text style={styles.largeAvatarText}>
                    {staffMember?.initial || "?"}
                  </Text>
                </View>
                <View style={styles.employeeDetails}>
                  <Text style={styles.employeeName}>
                    {staffMember?.name || staffName || "직원"}
                  </Text>
                  <Text style={styles.employeePosition}>
                    {staffMember?.position || "직책"}
                  </Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>재직중</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Gross Payment Amount Box */}
            <View style={styles.grossPaymentBox}>
              <Text style={styles.grossPaymentLabel}>세전 지급 기준액</Text>
              <View style={styles.grossAmountContainer}>
                <Text style={styles.grossPaymentAmount}>
                  {formatMoney(grossPay)}
                </Text>
                <Text style={styles.grossPaymentUnit}>원</Text>
              </View>
              <View style={styles.completionBadge}>
                <Text style={styles.completionBadgeText}>확정 완료</Text>
              </View>
            </View>

            {/* Payment Details Card */}
            <View style={styles.paymentDetailsCard}>
              <Text style={styles.sectionTitle}>지급 항목 내역</Text>

              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>기본급</Text>
                <Text style={styles.paymentAmount}>
                  {formatMoney(basicPay)}
                </Text>
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
                <Text style={styles.paymentAmount}>
                  {formatMoney(overtimePay)}
                </Text>
              </View>
              <View style={styles.divider} />

              <View style={[styles.paymentRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>세전 합계</Text>
                <Text style={styles.totalAmount}>{formatMoney(grossPay)}</Text>
              </View>
            </View>

            {/* Work Summary Card */}
            <TouchableOpacity
              style={styles.workSummaryCard}
              onPress={navigateToAttendanceDetail}
            >
              <View style={styles.workSummaryHeader}>
                <Text style={styles.sectionTitle}>근무 요약</Text>
                <Text style={styles.detailLink}>상세보기 &gt;</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>총 근무시간</Text>
                <Text style={styles.summaryValue}>
                  {formatMinutes(totalWorkMinutes)}
                </Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>시급</Text>
                <Text style={styles.summaryValue}>{formatMoney(wage)}원</Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>주휴수당 기준</Text>
                <Text style={[styles.summaryValue, styles.weeklyCriteria]}>
                  {weeklyHours >= 15 ? "주 15h 이상 ✓" : "주 15h 미충족"}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Legal Disclaimer Box */}
            <View style={styles.disclaimerBox}>
              <Text style={styles.disclaimerTitle}>⚠ 법적 면책 고지</Text>
              <Text style={styles.disclaimerText}>
                본 명세서는 세전 기준이며 실제 수령액과 다를 수 있습니다. 세금
                관련 문의는 담당 세무사에게 확인하세요.
              </Text>
            </View>

            {/* Bottom Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSavePDF}
              >
                <Text style={styles.saveButtonText}>📄 PDF 저장</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShare}
              >
                <Text style={styles.shareButtonText}>공유하기</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  headerDate: {
    fontSize: 13,
    color: colors.text2,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  employeeInfoCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
    ...shadows.card,
  },
  employeeHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  largeAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  largeAvatarText: {
    color: colors.surface,
    fontSize: 22,
    fontWeight: "600",
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  employeePosition: {
    fontSize: 14,
    color: colors.text2,
    marginBottom: 8,
  },
  statusBadge: {
    backgroundColor: colors.successDim,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  statusText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: "500",
  },
  grossPaymentBox: {
    backgroundColor: colors.primaryDim,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    ...shadows.card,
  },
  grossPaymentLabel: {
    fontSize: 12,
    color: colors.primary,
    marginBottom: 8,
  },
  grossAmountContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
  },
  grossPaymentAmount: {
    fontSize: 28,
    fontWeight: "600",
    color: colors.text,
    fontFamily: "monospace",
  },
  grossPaymentUnit: {
    fontSize: 14,
    color: colors.text2,
    marginLeft: 4,
  },
  completionBadge: {
    backgroundColor: colors.successDim,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  completionBadgeText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: "500",
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
  workSummaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  detailLink: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "500",
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
    ...shadows.card,
  },
  disclaimerTitle: {
    fontSize: 12,
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
    color: "#FFFFFF",
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
