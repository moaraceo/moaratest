import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import EmptyState from "./components/common/EmptyState";
import { useAttendance } from "./store/attendanceStore";
import { useStaff } from "./store/staffStore";
import { formatMinutes, formatMoney } from "./utils/format";

export default function StaffDetailScreen() {
  const router = useRouter();
  const { staffId } = useLocalSearchParams();
  const { records } = useAttendance();
  const { staffList, updateStaff } = useStaff();

  const [staff, setStaff] = useState<any>(null);

  useEffect(() => {
    if (staffId && staffList) {
      const foundStaff = staffList.find((s) => s.id === staffId);
      setStaff(foundStaff || null);
    }
  }, [staffId, staffList]);

  if (!staff) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>직원 상세</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>직원 정보를 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return colors.success;
      case "probation":
        return colors.warn;
      case "resigned":
        return colors.danger;
      default:
        return colors.text2;
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "active":
        return colors.successDim;
      case "probation":
        return colors.warnDim;
      case "resigned":
        return colors.dangerDim;
      default:
        return colors.surface2;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "재직중";
      case "probation":
        return "수습";
      case "resigned":
        return "퇴사";
      default:
        return status;
    }
  };

  const getAvatarColor = (status: string) => {
    switch (status) {
      case "active":
        return colors.primary;
      case "probation":
        return colors.warn;
      case "resigned":
        return colors.danger;
      default:
        return colors.text2;
    }
  };

  // 해당 직원의 근태 기록 필터링
  const staffRecords = records.filter((r) => r.staffName === staff.name);

  // 이번달 근무 시간 계산
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const thisMonthRecords = staffRecords.filter((r) => {
    const recordDate = new Date(r.date);
    return (
      recordDate.getMonth() + 1 === currentMonth &&
      recordDate.getFullYear() === currentYear
    );
  });

  const confirmedMinutes = thisMonthRecords
    .filter((r) => r.status === "CONFIRMED")
    .reduce((sum, record) => sum + (record.actualWorkMinutes || 0), 0);
  const pendingMinutes = thisMonthRecords
    .filter((r) => r.status === "PENDING")
    .reduce((sum, record) => sum + (record.actualWorkMinutes || 0), 0);
  const expectedPay = Math.floor((confirmedMinutes * staff.hourlyWage) / 60);

  const goBack = () => {
    router.back();
  };

  const navigateToAttendanceDetail = () => {
    router.push("/attendance-detail");
  };

  const handleRejoin = () => {
    Alert.alert("재입사 처리", `${staff.name}님을 재입사 처리하시겠습니까?`, [
      { text: "취소", style: "cancel" },
      {
        text: "재입사",
        onPress: () => {
          updateStaff(staff.workplaceId, staff.userId, { status: "active" });
          Alert.alert("완료", "재입사 처리되었습니다.");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{staff.name} · 상세</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Staff Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View
              style={[
                styles.largeAvatar,
                { backgroundColor: getAvatarColor(staff.status) },
              ]}
            >
              <Text style={styles.largeAvatarText}>{staff.initial}</Text>
            </View>
            <Text style={styles.staffName}>{staff.name}</Text>
            <Text style={styles.staffPosition}>{staff.position}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusBgColor(staff.status) },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(staff.status) },
                ]}
              >
                {getStatusText(staff.status)}
              </Text>
            </View>
          </View>
        </View>

        {/* Work Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionLabel}>근무 정보</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>시급</Text>
            <Text style={styles.hourlyWage}>
              {formatMoney(staff.hourlyWage)}/h
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>입사일</Text>
            <Text style={styles.infoValue}>{staff.joinDate}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>근무 형태</Text>
            <Text style={styles.infoValue}>파트타임</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>소정근로시간</Text>
            <Text style={styles.infoValue}>주 15시간</Text>
          </View>
          {staff.status === "resigned" && staff.resignDate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>퇴사일</Text>
              <Text style={styles.resignDate}>{staff.resignDate}</Text>
            </View>
          )}
          {staff.status === "resigned" && staff.rejoinDate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>재입사일</Text>
              <Text style={styles.rejoinDate}>{staff.rejoinDate}</Text>
            </View>
          )}
        </View>

        {/* This Month Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionLabel}>이번달 근무 현황</Text>
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

        {/* Attendance Records */}
        <View style={styles.recordsCard}>
          <Text style={styles.sectionLabel}>이번달 근태 기록</Text>

          {thisMonthRecords.length === 0 ? (
            <EmptyState
              icon="📋"
              title="근태 기록이 없어요"
              subtitle="이번달 근태 기록이 없습니다"
            />
          ) : (
            thisMonthRecords.map((record, index) => (
              <View key={record.id} style={styles.recordItem}>
                <View style={styles.recordLeft}>
                  <Text style={styles.recordDate}>{record.date}</Text>
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
                        {Math.floor((record.actualWorkMinutes || 0) / 60)}h{" "}
                        {(record.actualWorkMinutes || 0) % 60}m
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.recordRight}>
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
                </View>
              </View>
            ))
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => console.log("Edit staff info")}
          >
            <Text style={styles.editButtonText}>근무 정보 수정</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.attendanceButton}
            onPress={navigateToAttendanceDetail}
          >
            <Text style={styles.attendanceButtonText}>근태 내역 보기</Text>
          </TouchableOpacity>

          {staff.status === "resigned" && (
            <TouchableOpacity
              style={styles.rejoinButton}
              onPress={handleRejoin}
            >
              <Text style={styles.rejoinButtonText}>재입사 처리</Text>
            </TouchableOpacity>
          )}
        </View>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  backArrow: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: colors.text2,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    marginTop: 20,
    marginBottom: 20,
    alignItems: "center",
    ...shadows.card,
  },
  avatarContainer: {
    alignItems: "center",
  },
  largeAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  largeAvatarText: {
    fontSize: 32,
    fontWeight: "600",
    color: colors.surface,
  },
  staffName: {
    fontSize: 22,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  staffPosition: {
    fontSize: 14,
    color: colors.text2,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  infoCard: {
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
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.text2,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
  },
  hourlyWage: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
  },
  resignDate: {
    fontSize: 14,
    color: colors.danger,
    fontWeight: "600",
  },
  rejoinDate: {
    fontSize: 14,
    color: colors.success,
    fontWeight: "600",
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...shadows.card,
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
    backgroundColor: colors.border,
    marginHorizontal: 20,
  },
  subLabel: {
    fontSize: 12,
    color: colors.text2,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
  },
  confirmedValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.success,
  },
  pendingValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.warn,
  },
  recordsCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...shadows.card,
  },
  recordItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recordLeft: {
    flex: 1,
    marginRight: 12,
  },
  recordRight: {
    flexShrink: 0,
    alignItems: "flex-end",
  },
  recordDate: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text3,
    marginBottom: 8,
  },
  recordInfo: {
    gap: 4,
  },
  buttonContainer: {
    marginBottom: 40,
    gap: 12,
  },
  editButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.surface,
  },
  attendanceButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  attendanceButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  rejoinButton: {
    backgroundColor: colors.success,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  rejoinButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.surface,
  },
});
