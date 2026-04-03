import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import EmptyState from "./components/common/EmptyState";
import { CURRENT_MINIMUM_WAGE } from "./constants/minimumWage";
import { useAttendance } from "./store/attendanceStore";
import { formatMinutes, formatMoney } from "./utils/format";

export default function AttendanceDetailScreen() {
  const router = useRouter();
  const { recordId } = useLocalSearchParams();
  const { records } = useAttendance();

  // 샘플 데이터 - 실제로는 recordId로 해당 데이터 찾기
  const staffRecords = records.filter((r) => r.staffName === "김민지");
  const currentRecord = recordId
    ? staffRecords.find((r) => r.id === recordId)
    : null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "#34C97A";
      case "PENDING":
        return "#FFB547";
      case "REJECTED":
        return "#FF5C5C";
      default:
        return "#8B92AA";
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "rgba(52, 201, 122, 0.2)";
      case "PENDING":
        return "rgba(255, 181, 71, 0.2)";
      case "REJECTED":
        return "rgba(255, 92, 92, 0.2)";
      default:
        return "rgba(139, 146, 170, 0.2)";
    }
  };

  const formatWorkTime = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${String(m).padStart(2, "0")}m`;
  };

  const goBack = () => {
    router.back();
  };

  // 샘플 데이터
  const sampleRecords = [
    {
      id: currentRecord?.id || "1",
      date: "2025.03.14",
      day: "(목)",
      clockIn: "09:02",
      clockOut: "18:05",
      workMinutes: 543,
      breakMinutes: 60,
      actualWorkMinutes: 483,
      status: "PENDING",
      modifyRequest: null,
    },
    {
      id: "2",
      date: "2025.03.13",
      day: "(수)",
      clockIn: "09:15",
      clockOut: "17:30",
      workMinutes: 465,
      breakMinutes: 60,
      actualWorkMinutes: 405,
      status: "CONFIRMED",
      modifyRequest: null,
    },
    {
      id: "3",
      date: "2025.03.12",
      day: "(화)",
      clockIn: "08:45",
      clockOut: "17:50",
      workMinutes: 525,
      breakMinutes: 60,
      actualWorkMinutes: 465,
      status: "CONFIRMED",
      modifyRequest: {
        originalClockOut: "17:50",
        requestedClockOut: "19:00",
        reason: "마감 작업으로 19시 퇴근",
      },
    },
  ];

  const displayRecords = currentRecord ? [currentRecord] : sampleRecords;
  const confirmedMinutes = displayRecords
    .filter((r) => r.status === "CONFIRMED")
    .reduce((sum, record) => sum + record.actualWorkMinutes, 0);
  const pendingMinutes = displayRecords
    .filter((r) => r.status === "PENDING")
    .reduce((sum, record) => sum + record.actualWorkMinutes, 0);
  const expectedPay = Math.floor(
    (confirmedMinutes * CURRENT_MINIMUM_WAGE) / 60,
  );

  // 주훈련수당 계산 (주 15시간 이상 근무 시)
  const wage = CURRENT_MINIMUM_WAGE;
  const weeklyHours = confirmedMinutes / 60 / 4; // 월 근무시간을 주당 시간으로 환산
  const weeklyAllowance =
    weeklyHours >= 15 ? Math.floor((weeklyHours / 40) * 8 * wage) : 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>근태 내역 상세</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Employee Info Card */}
        <View style={styles.employeeCard}>
          <View style={styles.employeeHeader}>
            <View style={styles.largeAvatar}>
              <Text style={styles.largeAvatarText}>김</Text>
            </View>
            <View style={styles.employeeInfo}>
              <Text style={styles.employeeName}>김민지</Text>
              <Text style={styles.employeePosition}>홀 서빙</Text>
              <Text style={styles.hourlyWage}>
                시급 {formatMoney(CURRENT_MINIMUM_WAGE)}/h
              </Text>
            </View>
          </View>
        </View>

        {/* Monthly Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionLabel}>이번달 요약</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.subLabel}>총 근무시간</Text>
              <Text style={styles.summaryValue}>
                {formatMinutes(confirmedMinutes + pendingMinutes)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.subLabel}>예상 급여(세전)</Text>
              <Text style={styles.summaryValue}>
                {formatMoney(expectedPay)}
              </Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.subLabel}>확정 근무</Text>
              <Text style={styles.confirmedValue}>
                {formatMinutes(confirmedMinutes)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.subLabel}>미확정 근무</Text>
              <Text style={styles.pendingValue}>
                {formatMinutes(pendingMinutes)}
              </Text>
            </View>
          </View>
        </View>

        {/* Weekly Allowance Card */}
        <View style={styles.weeklyAllowanceCard}>
          <Text style={styles.weeklyAllowanceTitle}>✓ 주휴수당 충족</Text>
          <Text style={styles.weeklyAllowanceSubtext}>
            이번주 근무 15h 이상 달성
          </Text>
          <Text style={styles.weeklyAllowanceAmount}>
            {formatMoney(weeklyAllowance)}
          </Text>
        </View>

        {/* Daily Attendance Records */}
        <View style={styles.recordsCard}>
          <Text style={styles.sectionLabel}>날짜별 근태 기록</Text>

          {displayRecords.length === 0 ? (
            <EmptyState
              icon="📋"
              title="근태 기록이 없어요"
              subtitle="출퇴근 기록이 생기면 여기에 표시돼요"
            />
          ) : (
            displayRecords.map((record, index) => {
              const isClickable =
                record.status === "PENDING" || record.modifyRequest;

              return (
                <TouchableOpacity
                  key={record.id}
                  style={styles.recordItem}
                  onPress={() => {
                    if (isClickable) {
                      router.push({
                        pathname: "/approval-detail",
                        params: { recordId: record.id },
                      });
                    }
                  }}
                  disabled={!isClickable}
                >
                  <View style={styles.recordLeft}>
                    <Text style={styles.recordDate}>
                      {record.date} {record.day}
                    </Text>
                    <View style={styles.recordInfo}>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>출근</Text>
                        <Text style={styles.infoValue}>{record.clockIn}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>퇴근</Text>
                        <Text style={styles.infoValue}>{record.clockOut}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>근무시간</Text>
                        <Text style={styles.infoValue}>
                          {formatWorkTime(record.actualWorkMinutes)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.recordRight}>
                    <View style={styles.recordBadges}>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusBgColor(record.status) },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: getStatusColor(record.status) },
                          ]}
                        >
                          {record.status === "CONFIRMED"
                            ? "확정"
                            : record.status === "PENDING"
                              ? "미승인"
                              : "반려"}
                        </Text>
                      </View>
                      {record.modifyRequest && (
                        <View style={styles.modifiedBadge}>
                          <Text style={styles.modifiedText}>수정됨</Text>
                        </View>
                      )}
                    </View>
                    {record.status === "PENDING" && (
                      <Text style={styles.editableText}>수정 가능 &gt;</Text>
                    )}
                    {record.modifyRequest && (
                      <Text style={styles.reeditableText}>
                        재수정 가능 &gt;
                      </Text>
                    )}
                    {record.status === "CONFIRMED" && (
                      <Text style={styles.confirmedText}>확정됨</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F1117",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1A1D27",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2E3347",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#242736",
    borderWidth: 1,
    borderColor: "#2E3347",
    justifyContent: "center",
    alignItems: "center",
  },
  backArrow: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  employeeCard: {
    backgroundColor: "#242736",
    borderWidth: 1,
    borderColor: "#2E3347",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  employeeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  largeAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4A9EFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  largeAvatarText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  employeePosition: {
    fontSize: 14,
    color: "#8B92AA",
    marginBottom: 8,
  },
  hourlyWage: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4A9EFF",
  },
  summaryCard: {
    backgroundColor: "#242736",
    borderWidth: 1,
    borderColor: "#2E3347",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#2E3347",
    marginHorizontal: 20,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#8B92AA",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "600",
  },
  subLabel: {
    fontSize: 11,
    color: "#8B92AA",
    marginBottom: 2,
  },
  confirmedValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#34C97A",
  },
  pendingValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFB547",
  },
  weeklyAllowanceCard: {
    backgroundColor: "#0D3320",
    borderWidth: 1,
    borderColor: "#34C97A",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    alignItems: "center",
  },
  weeklyAllowanceTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#34C97A",
    marginBottom: 4,
  },
  weeklyAllowanceSubtext: {
    fontSize: 12,
    color: "#8B92AA",
    textAlign: "center",
  },
  weeklyAllowanceAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  recordsCard: {
    backgroundColor: "#242736",
    borderWidth: 1,
    borderColor: "#2E3347",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  recordItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2E3347",
  },
  recordLeft: {
    flex: 1,
    marginRight: 12,
  },
  recordRight: {
    flexShrink: 0,
    alignItems: "flex-end",
    gap: 4,
  },
  recordDate: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E8EAF0",
    marginBottom: 8,
  },
  recordInfo: {
    gap: 4,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: "#8B92AA",
  },
  infoValue: {
    fontSize: 13,
    color: "#E8EAF0",
    fontWeight: "600",
  },
  recordBadges: {
    flexDirection: "row",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  modifiedBadge: {
    backgroundColor: "rgba(139, 146, 170, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modifiedText: {
    color: "#8B92AA",
    fontSize: 10,
    fontWeight: "500",
  },
  editableText: {
    fontSize: 11,
    color: "#FFB547",
    fontWeight: "500",
    marginTop: 4,
  },
  reeditableText: {
    fontSize: 11,
    color: "#4A9EFF",
    fontWeight: "500",
    marginTop: 4,
  },
  confirmedText: {
    fontSize: 11,
    color: "#34C97A",
    fontWeight: "500",
    marginTop: 4,
  },
});
