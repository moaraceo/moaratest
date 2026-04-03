import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import StaffTabBar from "./components/common/StaffTabBar";
import { borderRadius, colors, shadows, spacing } from "../constants/theme";

const CHART_HEIGHT = 120;
const Y_AXIS_WIDTH = 36;

export default function WorkHistoryScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month">(
    "week",
  );
  const [selectedTab, setSelectedTab] = useState<"today" | "history">("today");

  // 샘플 데이터 (단위: 시간)
  const sampleData = {
    week: {
      labels: ["월", "화", "수", "목", "금", "토", "일"],
      thisWeek: [8, 7, 8.5, 7.5, 9, 4, 0],
      lastWeek: [7.5, 8, 7, 8.5, 8, 3.5, 0],
    },
    month: {
      labels: Array.from({ length: 31 }, (_, i) => `${i + 1}일`),
      thisWeek: Array.from({ length: 31 }, () =>
        parseFloat((Math.random() * 9 + 1).toFixed(1)),
      ),
      lastWeek: Array.from({ length: 31 }, () =>
        parseFloat((Math.random() * 9 + 1).toFixed(1)),
      ),
    },
  };

  const currentData = sampleData[selectedPeriod];
  const allValues = [...currentData.thisWeek, ...currentData.lastWeek];
  const maxValue = Math.max(...allValues, 1);

  // Y축 라벨 계산 (0h ~ maxH, 5단계)
  const yAxisLabels = Array.from({ length: 5 }, (_, i) => {
    const val = ((4 - i) / 4) * maxValue;
    return val === 0 ? "0h" : `${Math.round(val)}h`;
  });

  const renderBarChart = () => (
    <View style={styles.chartArea}>
      {/* Y축 고정 시간 라벨 */}
      <View style={styles.yAxis}>
        {yAxisLabels.map((label, i) => (
          <Text key={i} style={styles.yLabel}>
            {label}
          </Text>
        ))}
      </View>

      {/* 가로 스크롤 막대 그래프 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        <View style={styles.barsArea}>
          {/* 격자선 */}
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            {[0, 1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[
                  styles.gridLine,
                  { top: (i / 4) * CHART_HEIGHT },
                ]}
              />
            ))}
          </View>

          {/* 각 날짜별 바 */}
          {currentData.labels.map((label, index) => (
            <View key={index} style={styles.barGroup}>
              <View style={styles.barsRow}>
                {/* 이번주 바 */}
                <View
                  style={[
                    styles.bar,
                    {
                      height:
                        (currentData.thisWeek[index] / maxValue) * CHART_HEIGHT,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
                {/* 지난주 바 */}
                <View
                  style={[
                    styles.bar,
                    {
                      height:
                        (currentData.lastWeek[index] / maxValue) * CHART_HEIGHT,
                      backgroundColor: colors.text3,
                    },
                  ]}
                />
              </View>
              <Text style={styles.dayLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  // 요약 계산
  const thisTotalHours = currentData.thisWeek
    .reduce((a, b) => a + b, 0)
    .toFixed(1);
  const lastTotalHours = currentData.lastWeek
    .reduce((a, b) => a + b, 0)
    .toFixed(1);
  const thisDays = currentData.thisWeek.filter((h) => h > 0).length;
  const lastDays = currentData.lastWeek.filter((h) => h > 0).length;

  return (
    <View style={styles.container}>
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* 상단 탭 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === "today" && styles.activeTab]}
          onPress={() => setSelectedTab("today")}
        >
          <Text
            style={[
              styles.tabText,
              selectedTab === "today" && styles.activeTabText,
            ]}
          >
            오늘
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === "history" && styles.activeTab]}
          onPress={() => setSelectedTab("history")}
        >
          <Text
            style={[
              styles.tabText,
              selectedTab === "history" && styles.activeTabText,
            ]}
          >
            월
          </Text>
        </TouchableOpacity>
      </View>

      {/* 오늘 탭 */}
      {selectedTab === "today" && (
        <View style={styles.todayCard}>
          <Text style={styles.todayTitle}>오늘 근무 현황</Text>
          <Text style={styles.todayTime}>09:00 ~ 18:00</Text>
          <View style={styles.statusBadge}>
            <Text style={[styles.todayStatus, { color: colors.success }]}>
              근무 중
            </Text>
          </View>
        </View>
      )}

      {/* 월 탭 */}
      {selectedTab === "history" && (
        <>
          {/* 기간 선택 */}
          <View style={styles.periodContainer}>
            <TouchableOpacity
              style={[
                styles.periodButton,
                selectedPeriod === "week" && styles.activePeriodButton,
              ]}
              onPress={() => setSelectedPeriod("week")}
            >
              <Text
                style={[
                  styles.periodText,
                  selectedPeriod === "week" && styles.activePeriodText,
                ]}
              >
                주간
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.periodButton,
                selectedPeriod === "month" && styles.activePeriodButton,
              ]}
              onPress={() => setSelectedPeriod("month")}
            >
              <Text
                style={[
                  styles.periodText,
                  selectedPeriod === "month" && styles.activePeriodText,
                ]}
              >
                월간
              </Text>
            </TouchableOpacity>
          </View>

          {/* 범례 */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: colors.primary }]}
              />
              <Text style={styles.legendText}>
                {selectedPeriod === "month" ? "이번달" : "이번주"}
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: colors.text3 }]}
              />
              <Text style={styles.legendText}>
                {selectedPeriod === "month" ? "지난달" : "지난주"}
              </Text>
            </View>
          </View>

          {/* 막대 그래프 */}
          <View style={styles.chartCard}>{renderBarChart()}</View>
        </>
      )}

      {/* 이번주/이번달 내역 */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>
          {selectedPeriod === "month" ? "이번달 내역" : "이번주 내역"}
        </Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>총 근무시간</Text>
          <Text style={styles.summaryValue}>{thisTotalHours}시간</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>예상 급여</Text>
          <Text style={styles.summaryValue}>
            ₩{(parseFloat(thisTotalHours) * 10030).toLocaleString()}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>근무 일수</Text>
          <Text style={styles.summaryValue}>{thisDays}일</Text>
        </View>
      </View>

      {/* 지난주/지난달 내역 */}
      <View style={[styles.summaryCard, { marginBottom: spacing.xl }]}>
        <Text style={styles.summaryTitle}>
          {selectedPeriod === "month" ? "지난달 내역" : "지난주 내역"}
        </Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>총 근무시간</Text>
          <Text style={styles.summaryValue}>{lastTotalHours}시간</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>예상 급여</Text>
          <Text style={styles.summaryValue}>
            ₩{(parseFloat(lastTotalHours) * 10030).toLocaleString()}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>근무 일수</Text>
          <Text style={styles.summaryValue}>{lastDays}일</Text>
        </View>
      </View>
    </ScrollView>
    <StaffTabBar activeTab="history" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    margin: spacing.md,
    ...shadows.card,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: borderRadius.sm,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text2,
  },
  activeTabText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  todayCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    alignItems: "center",
    ...shadows.card,
  },
  todayTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  todayTime: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
  },
  statusBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.successDim,
    borderRadius: borderRadius.round,
  },
  todayStatus: {
    fontSize: 16,
    fontWeight: "600",
  },
  periodContainer: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    ...shadows.card,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: borderRadius.sm,
  },
  activePeriodButton: {
    backgroundColor: colors.primary,
  },
  periodText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text2,
  },
  activePeriodText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: colors.text2,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    ...shadows.card,
  },
  chartArea: {
    flexDirection: "row",
    height: CHART_HEIGHT + 24,
  },
  yAxis: {
    width: Y_AXIS_WIDTH,
    height: CHART_HEIGHT,
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingRight: spacing.xs,
  },
  yLabel: {
    fontSize: 10,
    color: colors.text3,
    lineHeight: 14,
  },
  barsArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: CHART_HEIGHT + 24,
    paddingBottom: 24,
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.5,
  },
  barGroup: {
    alignItems: "center",
    marginHorizontal: 6,
    width: 32,
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: CHART_HEIGHT,
  },
  bar: {
    width: 12,
    borderRadius: 3,
    minHeight: 2,
  },
  dayLabel: {
    fontSize: 11,
    color: colors.text2,
    marginTop: 4,
    textAlign: "center",
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.lg,
    ...shadows.card,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.text2,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
});
