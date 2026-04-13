import { useRouter } from "expo-router";
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
import { formatMoney } from "./utils/format";

export default function LaborReportScreen() {
  const router = useRouter();
  const { records } = useAttendance();
  const { staffList } = useStaff();

  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(3);

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

  // 이번달 확정 근태 필터링
  const thisMonthRecords = records.filter((record) => {
    const recordDate = new Date(record.date);
    return (
      record.status === "CONFIRMED" &&
      recordDate.getMonth() + 1 === month &&
      recordDate.getFullYear() === year
    );
  });

  // 재직중 직원 필터링
  const activeStaff = staffList.filter(
    (staff) => staff.status === "active" || staff.status === "probation",
  );

  // 샘플 직원 데이터 (실제 데이터 없을 때 사용)
  const sampleStaffCosts = [
    { id: "1", name: "김민지",  initial: "김", position: "홀 서빙",   hourlyWage: 10500, totalMinutes: 9960,  laborCost: 1743000, workHours: 166, workMinutes: 0 },
    { id: "2", name: "박준혁",  initial: "박", position: "주방 보조",  hourlyWage: 10030, totalMinutes: 9780,  laborCost: 1634888, workHours: 163, workMinutes: 0 },
    { id: "3", name: "이수연",  initial: "이", position: "카운터",    hourlyWage: 10500, totalMinutes: 7200,  laborCost: 1260000, workHours: 120, workMinutes: 0 },
    { id: "4", name: "최태양",  initial: "최", position: "홀 서빙",   hourlyWage: 10030, totalMinutes: 5400,  laborCost:  902700, workHours:  90, workMinutes: 0 },
  ];

  // 직원별 근무시간 및 인건비 계산 (실제 데이터 우선, 없으면 샘플)
  const realStaffCosts = activeStaff.map((staff) => {
    const staffRecords = thisMonthRecords.filter(
      (record) => record.staffName === staff.name,
    );
    const totalMinutes = staffRecords.reduce(
      (sum, record) => sum + (record.actualWorkMinutes || 0),
      0,
    );
    const laborCost = Math.floor((totalMinutes / 60) * staff.hourlyWage);
    return {
      ...staff,
      totalMinutes,
      laborCost,
      workHours: Math.floor(totalMinutes / 60),
      workMinutes: totalMinutes % 60,
    };
  });

  const staffLaborCosts = thisMonthRecords.length > 0 ? realStaffCosts : sampleStaffCosts;

  // 총 인건비 계산
  const totalLaborCost = staffLaborCosts.reduce((sum, s) => sum + s.laborCost, 0);
  const totalWorkHours = staffLaborCosts.reduce((sum, s) => sum + s.totalMinutes, 0) / 60;

  // 월별 인건비 데이터 (샘플)
  const monthlyData = [
    { month: "10월", amount: 2700000 },
    { month: "11월", amount: 2900000 },
    { month: "12월", amount: 3100000 },
    { month: "1월",  amount: 2950000 },
    { month: "2월",  amount: 3000000 },
    { month: "3월",  amount: totalLaborCost || 3240000 },
  ];

  const maxAmount = Math.max(...monthlyData.map((d) => d.amount));

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>인건비 리포트</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Month Navigator */}
        <View style={styles.monthNavigator}>
          <TouchableOpacity style={styles.monthButton} onPress={prevMonth}>
            <Text style={styles.monthButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthText}>
            {year}.{month.toString().padStart(2, "0")}
          </Text>
          <TouchableOpacity style={styles.monthButton} onPress={nextMonth}>
            <Text style={styles.monthButtonText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {formatMoney(totalLaborCost)}
            </Text>
            <Text style={styles.metricChange}>전월 대비 ▲ 50,000원</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {Math.floor(totalWorkHours)}시간
            </Text>
            <Text style={styles.metricChangeGreen}>전월 대비 ▼ 5시간</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>재직 {activeStaff.length}명</Text>
            <Text style={styles.metricSubtitle}>퇴사 1명</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>80,000원</Text>
            <Text style={styles.metricSubtitle}>지급 대상 2명</Text>
          </View>
        </View>

        {/* AI Analysis Box */}
        <View style={styles.aiBox}>
          <View style={styles.aiHeader}>
            <Text style={styles.aiIcon}>🤖</Text>
            <Text style={styles.aiTitle}>MOARA 분석</Text>
          </View>
          <Text style={styles.aiContent}>
            5월 인건비가 지난 3개월 평균 대비 6.4% 증가했어요. 이서준 님의
            연장근로가 주요 원인이에요.
          </Text>
        </View>

        {/* Monthly Trend Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.sectionLabel}>월별 인건비 추이</Text>
          <View style={styles.chartContainer}>
            {monthlyData.map((data, index) => (
              <View key={index} style={styles.chartBarContainer}>
                <Text style={styles.chartAmount}>
                  {Math.floor(data.amount / 10000)}
                </Text>
                <View
                  style={[
                    styles.chartBar,
                    {
                      height: (data.amount / maxAmount) * 100,
                      backgroundColor:
                        index === monthlyData.length - 1
                          ? "#4A9EFF"
                          : "#2E3347",
                    },
                  ]}
                />
                <Text style={styles.chartMonth}>{data.month}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Staff Labor Costs */}
        <View style={styles.listCard}>
          <Text style={styles.sectionLabel}>직원별 인건비</Text>
          {staffLaborCosts.map((staff, index) => {
            const percentage =
              totalLaborCost > 0 ? (staff.laborCost / totalLaborCost) * 100 : 0;

            return (
              <View key={staff.id} style={styles.staffItem}>
                <View style={styles.staffInfo}>
                  <View style={styles.smallAvatar}>
                    <Text style={styles.smallAvatarText}>{staff.initial}</Text>
                  </View>
                  <View style={styles.staffDetails}>
                    <Text style={styles.staffName}>{staff.name}</Text>
                    <Text style={styles.staffHours}>
                      {staff.workHours}h {staff.workMinutes}m 근무
                    </Text>
                  </View>
                </View>
                <View style={styles.staffCost}>
                  <Text style={styles.staffCostAmount}>
                    {formatMoney(staff.laborCost)}
                  </Text>
                  <View style={styles.progressBar}>
                    <View
                      style={[styles.progressFill, { width: `${percentage}%` }]}
                    />
                  </View>
                  <Text style={styles.staffPercentage}>
                    {Math.floor(percentage)}%
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Cost Breakdown */}
        <View style={styles.listCard}>
          <Text style={styles.sectionLabel}>인건비 구성</Text>
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownLeft}>
              <Text style={styles.colorDot}>●</Text>
              <Text style={styles.breakdownLabel}>기본급</Text>
            </View>
            <Text style={styles.breakdownAmount}>
              {formatMoney(Math.floor(totalLaborCost * 0.864))} (86.4%)
            </Text>
          </View>
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownLeft}>
              <Text style={[styles.colorDot, { color: "#34C97A" }]}>●</Text>
              <Text style={styles.breakdownLabel}>주휴수당</Text>
            </View>
            <Text style={styles.breakdownAmount}>80,000원 (2.5%)</Text>
          </View>
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownLeft}>
              <Text style={[styles.colorDot, { color: "#FFB547" }]}>●</Text>
              <Text style={styles.breakdownLabel}>연장수당</Text>
            </View>
            <Text style={styles.breakdownAmount}>
              {formatMoney(Math.floor(totalLaborCost * 0.074))} (7.4%)
            </Text>
          </View>
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownLeft}>
              <Text style={[styles.colorDot, { color: "#9B59B6" }]}>●</Text>
              <Text style={styles.breakdownLabel}>야간수당</Text>
            </View>
            <Text style={styles.breakdownAmount}>
              {formatMoney(Math.floor(totalLaborCost * 0.037))} (3.7%)
            </Text>
          </View>
        </View>
      </ScrollView>

      <OwnerTabBar activeTab="report" />
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
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  backArrow: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: "600",
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
  headerRight: {
    width: 32,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  monthNavigator: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 20,
    gap: 20,
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
  monthButtonText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: "600",
  },
  monthText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    fontFamily: "monospace",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    flex: 1,
    minWidth: "45%",
    ...shadows.card,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  metricChange: {
    fontSize: 12,
    color: colors.danger,
  },
  metricChangeGreen: {
    fontSize: 12,
    color: colors.success,
  },
  metricSubtitle: {
    fontSize: 12,
    color: colors.text2,
  },
  aiBox: {
    backgroundColor: colors.primaryDim,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    ...shadows.card,
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  aiIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  aiContent: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "600",
    lineHeight: 20,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    ...shadows.card,
  },
  sectionLabel: {
    fontSize: 11,
    color: colors.text2,
    textTransform: "uppercase",
    marginBottom: 16,
    fontWeight: "600",
  },
  chartContainer: {
    flexDirection: "row",
    height: 160,
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  chartBarContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  chartAmount: {
    fontSize: 12,
    color: colors.text,
    marginBottom: 4,
  },
  chartBar: {
    width: 20,
    minHeight: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  chartMonth: {
    fontSize: 10,
    color: colors.text2,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    ...shadows.card,
  },
  staffItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  staffInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  smallAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  smallAvatarText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.surface,
  },
  staffDetails: {
    flex: 1,
  },
  staffName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 2,
  },
  staffHours: {
    fontSize: 12,
    color: colors.text2,
  },
  staffCost: {
    alignItems: "flex-end",
    flex: 1,
  },
  staffCostAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  progressBar: {
    width: "100%",
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginBottom: 2,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  staffPercentage: {
    fontSize: 10,
    color: colors.text2,
  },
  breakdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  breakdownLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  colorDot: {
    fontSize: 12,
    color: colors.primary,
    marginRight: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: colors.text,
  },
  breakdownAmount: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
  },
});
