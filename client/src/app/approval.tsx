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
import { useAttendance } from "./store/attendanceStore";

type FilterTab = "today" | "week" | "month";

export default function ApprovalScreen() {
  const router = useRouter();
  const { getPendingRecords } = useAttendance();
  const [activeFilter, setActiveFilter] = useState<FilterTab>("today");

  const pendingItems = getPendingRecords();

  const goBack = () => {
    router.back();
  };

  const formatWorkTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins.toString().padStart(2, "0")}m`;
  };

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "today", label: "오늘" },
    { key: "week", label: "이번주" },
    { key: "month", label: "이번달" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>작업 승인</Text>
        {pendingItems.length > 0 ? (
          <TouchableOpacity style={styles.allApproveBtn}>
            <Text style={styles.allApproveBtnText}>✓ 전체 승인</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {/* 필터 탭 */}
      <View style={styles.filterTabRow}>
        {filterTabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterTab, activeFilter === tab.key && styles.filterTabActive]}
            onPress={() => setActiveFilter(tab.key)}
          >
            <Text style={[styles.filterTabText, activeFilter === tab.key && styles.filterTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Pending Approval List */}
        {pendingItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <EmptyState
              icon="✅"
              title="모두 처리됐어요"
              subtitle="대기중인 작업이 없습니다"
            />
          </View>
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
                      <Text style={styles.infoLabel}>출근</Text>
                      <Text style={styles.infoValue}>{item.clockIn}</Text>
                    </View>
                    <View style={styles.divider} />
                  </>
                )}

                {item.clockOut ? (
                  <>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>퇴근</Text>
                      <Text style={styles.infoValue}>{item.clockOut}</Text>
                    </View>
                    <View style={styles.divider} />
                  </>
                ) : (
                  <>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>퇴근</Text>
                      <Text style={[styles.infoValue, { color: colors.danger }]}>(미기록)</Text>
                    </View>
                    <View style={styles.divider} />
                  </>
                )}

                {item.workMinutes > 0 && (
                  <>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>근무시간</Text>
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
                      <Text style={styles.infoLabel}>수정요청</Text>
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
                      <Text style={styles.infoLabel}>수정 사유</Text>
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
        <View style={{ height: 20 }} />
      </ScrollView>

      <OwnerTabBar activeTab="approval" />
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  backArrow: {
    fontSize: 18,
    color: colors.text,
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  allApproveBtn: {
    backgroundColor: colors.success,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  allApproveBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  filterTabRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.text2,
  },
  filterTabTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    marginTop: 8,
    ...shadows.card,
    overflow: "hidden",
  },
  approvalCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    marginBottom: 12,
    ...shadows.card,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.bg,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryDim,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "700",
  },
  cardHeaderInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
  },
  cardDate: {
    fontSize: 12,
    color: colors.text2,
  },
  reviewBadge: {
    backgroundColor: colors.warnDim,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  reviewBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.warn,
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.text2,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
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
    backgroundColor: colors.bg,
  },
});
