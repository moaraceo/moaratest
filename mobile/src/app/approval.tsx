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
import EmptyState from "./components/common/EmptyState";
import OwnerTabBar from "./components/common/OwnerTabBar";
import Toast from "./components/common/Toast";
import { useAttendance } from "./store/attendanceStore";

export default function ApprovalScreen() {
  const router = useRouter();
  const { getPendingRecords, approveAllRecords } = useAttendance();
  const [selectedPeriod, setSelectedPeriod] = useState<"today" | "week" | "month">("today");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "warning") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  };

  const handleApproveAll = async () => {
    const pending = getPendingRecords();
    if (pending.length === 0) {
      showToast("승인할 항목이 없습니다", "warning");
      return;
    }
    try {
      const count = await approveAllRecords();
      showToast(`${count}건이 일괄 승인되었습니다`, "success");
    } catch {
      showToast("승인 처리 중 오류가 발생했습니다", "error");
    }
  };

  const pendingItems = getPendingRecords();

  const goBack = () => {
    router.back();
  };

  const formatWorkTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins.toString().padStart(2, "0")}m`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>근태 승인</Text>
        <TouchableOpacity style={styles.approveAllButton} onPress={handleApproveAll}>
          <Text style={styles.approveAllText}>✓ 전체 승인</Text>
        </TouchableOpacity>
      </View>

      {/* Period Filter Tabs */}
      <View style={styles.periodTabs}>
        {(["today", "week", "month"] as const).map((period) => (
          <TouchableOpacity
            key={period}
            style={[styles.periodTab, selectedPeriod === period && styles.periodTabActive]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text style={[styles.periodTabText, selectedPeriod === period && styles.periodTabTextActive]}>
              {period === "today" ? "오늘" : period === "week" ? "이번 주" : "이번 달"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Warning Box */}
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠ 미승인 {pendingItems.length}건 — 급여 확정 전 처리 필요
          </Text>
        </View>

        {/* Pending Approval List */}
        {pendingItems.length === 0 ? (
          <EmptyState
            icon="✅"
            title="모든 근태가 승인됐어요"
            subtitle="미승인 근태가 없어요"
          />
        ) : (
          pendingItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.approvalCard}
              onPress={() =>
                router.push(`/approval-detail?recordId=${item.id}`)
              }
            >
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.staffInitial}</Text>
                  </View>
                  <View style={styles.cardHeaderInfo}>
                    <Text style={styles.employeeName}>{item.staffName}</Text>
                    <Text style={styles.cardDate}>{item.date}</Text>
                  </View>
                </View>
                <View style={styles.reviewBadge}>
                  <Text style={styles.reviewBadgeText}>검토필요</Text>
                </View>
              </View>

              {/* Card Content */}
              <View style={styles.cardContent}>
                {item.clockIn && (
                  <>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>출근:</Text>
                      <Text style={styles.infoValue}>{item.clockIn}</Text>
                    </View>
                    <View style={styles.divider} />
                  </>
                )}

                {item.clockOut ? (
                  <>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>퇴근:</Text>
                      <Text style={styles.infoValue}>{item.clockOut}</Text>
                    </View>
                    <View style={styles.divider} />
                  </>
                ) : (
                  <>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>퇴근:</Text>
                      <Text style={styles.infoValue}>(미기록)</Text>
                    </View>
                    <View style={styles.divider} />
                  </>
                )}

                {item.workMinutes > 0 && (
                  <>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>근무시간:</Text>
                      <Text style={styles.workHours}>
                        {formatWorkTime(item.workMinutes)}
                      </Text>
                    </View>
                    <View style={styles.divider} />
                  </>
                )}

                {item.modifyRequest && (
                  <>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>수정요청:</Text>
                      <Text style={styles.infoValue}>
                        <Text style={styles.originalTime}>
                          {item.modifyRequest.originalClockOut}
                        </Text>
                        {" → "}
                        <Text style={styles.requestedTime}>
                          {item.modifyRequest.requestedClockOut}
                        </Text>
                      </Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>수정 사유:</Text>
                      <Text style={styles.reasonText}>
                        {item.modifyRequest.reason}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <OwnerTabBar activeTab="approval" />
      {toast && <Toast message={toast.message} type={toast.type} />}
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
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
  },
  approveAllButton: {
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  approveAllText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  periodTabs: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  periodTab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.bg,
  },
  periodTabActive: {
    backgroundColor: colors.primary,
  },
  periodTabText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.text2,
  },
  periodTabTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  warningBox: {
    backgroundColor: colors.warnDim,
    borderWidth: 1,
    borderColor: colors.warn,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 20,
    ...shadows.card,
  },
  warningText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.warn,
    textAlign: "center",
  },
  approvalCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    marginBottom: 16,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "600",
  },
  cardHeaderInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 2,
  },
  cardDate: {
    fontSize: 12,
    color: colors.text2,
  },
  reviewBadge: {
    backgroundColor: colors.warnDim,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reviewBadgeText: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.warn,
  },
  cardContent: {
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.text2,
    width: 120,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  originalTime: {
    textDecorationLine: "line-through",
    color: colors.text2,
  },
  requestedTime: {
    color: colors.warn,
    fontWeight: "600",
  },
  reasonText: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
    textAlign: "right",
  },
  workHours: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
});
