import { router } from "expo-router";
import React, { useState } from "react";
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { colors, shadows } from "../constants/theme";
import OwnerTabBar from "./components/common/OwnerTabBar";
import { useAttendance } from "./store/attendanceStore";
import { useStaff } from "./store/staffStore";
import { formatMonth } from "./utils/format";

export default function PayrollScreen() {
  const { staffList } = useStaff();
  const { getConfirmedRecords } = useAttendance();
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(3);

  // Calculate payroll data dynamically
  const payrollData = staffList.map((staff) => {
    const staffRecords = getConfirmedRecords().filter(
      (r) => r.staffName === staff.name,
    );
    const totalWorkMinutes = staffRecords.reduce(
      (sum, record) => sum + (record.workMinutes || 0),
      0,
    );
    const totalWorkHours = Math.floor(totalWorkMinutes / 60);

    // Calculate base pay
    const basePay = Math.floor((totalWorkMinutes / 60) * staff.hourlyWage);

    // Calculate weekly allowance (주 15시간 이상)
    const weeklyWorkHours = totalWorkHours / 4; // Approximate weekly hours
    const weeklyAllowance =
      weeklyWorkHours >= 15
        ? Math.floor((weeklyWorkHours / 40) * 8 * staff.hourlyWage)
        : 0;

    const totalPay = basePay + weeklyAllowance;

    return {
      id: staff.id,
      name: staff.name,
      initial: staff.initial,
      workHours: totalWorkHours,
      weeklyAllowance: weeklyAllowance > 0,
      amount: totalPay,
      status: "확정",
      hourlyWage: staff.hourlyWage,
    };
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "확정":
        return colors.success;
      case "검토필요":
        return colors.warn;
      case "미확정":
        return colors.primary;
      default:
        return colors.text2;
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "확정":
        return colors.successDim;
      case "검토필요":
        return colors.warnDim;
      case "미확정":
        return colors.primaryDim;
      default:
        return colors.surface2;
    }
  };

  const handleEmployeeDetail = (
    employeeId: string,
    employeeName: string,
    hourlyWage: number,
  ) => {
    router.push({
      pathname: "/payroll-detail",
      params: {
        staffId: employeeId,
        staffName: employeeName,
        hourlyWage: String(hourlyWage),
      },
    });
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
        <Text style={styles.headerTitle}>급여 정산</Text>
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
        {/* Total Payroll Card */}
        <View style={styles.totalPayrollCard}>
          <Text style={styles.totalLabel}>이번달 세전 총 인건비</Text>
          <View style={styles.totalAmountContainer}>
            <Text style={styles.totalAmount}>
              {payrollData
                .reduce((sum, emp) => sum + emp.amount, 0)
                .toLocaleString()}
            </Text>
            <Text style={styles.totalUnit}>원</Text>
          </View>
        </View>

        {/* Warning Box */}
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠ 미승인 근태{" "}
            {payrollData.filter((emp) => emp.status !== "확정").length}건 — 급여
            확정 전 처리 필요
          </Text>
        </View>

        {/* Employee Payroll List */}
        <View style={styles.payrollListCard}>
          <Text style={styles.sectionLabel}>직원별 내역</Text>

          {payrollData.map((employee, index) => (
            <View key={employee.id}>
              <TouchableOpacity
                style={styles.employeeItem}
                onPress={() =>
                  handleEmployeeDetail(
                    employee.id,
                    employee.name,
                    employee.hourlyWage,
                  )
                }
              >
                <View style={styles.employeeLeft}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{employee.initial}</Text>
                  </View>
                  <View style={styles.employeeInfo}>
                    <Text style={styles.employeeName}>{employee.name}</Text>
                    <Text style={styles.employeeWorkHours}>
                      근무 {employee.workHours}h · 주휴{" "}
                      {employee.weeklyAllowance ? "✓" : "검토필요"}
                    </Text>
                    <Text style={styles.employeeAmount}>
                      {employee.amount.toLocaleString()}원
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusBgColor(employee.status) },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(employee.status) },
                    ]}
                  >
                    {employee.status}
                  </Text>
                </View>
              </TouchableOpacity>
              {index < payrollData.length - 1 && (
                <View style={styles.divider} />
              )}
            </View>
          ))}
        </View>

        {/* Legal Disclaimer */}
        <View style={styles.legalDisclaimer}>
          <Text style={styles.legalDisclaimerText}>
            ※ 급여 명세서는 근로기준법에 따라 작성되었으며, 세금 공제는 적용되지
            않은 세전 금액입니다.
          </Text>
        </View>
      </ScrollView>

      <OwnerTabBar activeTab="payroll" />
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
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backArrow: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  monthNavigator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  monthButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  monthArrow: {
    fontSize: 18,
    color: colors.text2,
    fontWeight: "600",
  },
  monthText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
    minWidth: 80,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  totalPayrollCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 24,
    marginTop: 20,
    marginBottom: 20,
    ...shadows.card,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.text2,
    marginBottom: 12,
  },
  totalAmountContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.primary,
    marginRight: 8,
  },
  totalUnit: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.text2,
  },
  warningBox: {
    backgroundColor: colors.dangerDim,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    ...shadows.card,
  },
  warningText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.danger,
  },
  payrollListCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...shadows.card,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 16,
  },
  employeeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  employeeLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.surface,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  employeeWorkHours: {
    fontSize: 14,
    color: colors.text2,
    marginBottom: 4,
  },
  employeeAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  legalDisclaimer: {
    backgroundColor: colors.warnDim,
    borderWidth: 1,
    borderColor: colors.warn,
    borderRadius: 12,
    padding: 16,
    marginBottom: 100, // Space for tab bar
  },
  legalDisclaimerText: {
    fontSize: 12,
    color: colors.warn,
    lineHeight: 18,
  },
});
