import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, shadows } from "../constants/theme";
import LoadingSpinner from "./components/common/LoadingSpinner";
import OwnerTabBar from "./components/common/OwnerTabBar";
import { CURRENT_MINIMUM_WAGE } from "./constants/minimumWage";
import { useAttendance } from "./store/attendanceStore";
import { useAuth } from "./store/authStore";
import { usePayrollSettings } from "./store/payrollSettingsStore";
import { useStaff } from "./store/staffStore";
import { useWorkplace } from "./store/workplaceStore";
import { calcDailyPayroll } from "./utils/payroll";
import { formatMoney } from "./utils/format";

// 카드 배경색 팔레트
const palette = {
  white:   "#FFFFFF",
  yellow:  "#FFFBE6",
  mint:    "#E8F6F0",
  green:   "#EDFAF3",
  pink:    "#FFF0F0",
  blue:    "#EFF6FF",
  gray:    "#F4F5F7",
  orange:  "#FFF4E5",
};

const statusConfig: Record<string, { bg: string; dot: string; label: string; icon: string }> = {
  근무중:   { bg: palette.mint,   dot: "#22C55E", label: "근무중",   icon: "●" },
  퇴근누락: { bg: palette.orange, dot: "#F59E0B", label: "퇴근 누락", icon: "▲" },
  출근전:   { bg: palette.gray,   dot: "#94A3B8", label: "출근 전",  icon: "○" },
  미출근:   { bg: palette.yellow, dot: "#F59E0B", label: "미출근",   icon: "▲" },
  퇴근:     { bg: palette.white,  dot: "#94A3B8", label: "퇴근",    icon: "●" },
};

export default function OwnerDashboardScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const { signOut } = useAuth();
  const { getUnderWageStaff, getActiveStaffByWorkplace } = useStaff();
  const { records, getPendingRecords } = useAttendance();
  const { getCurrentWorkplace } = useWorkplace();
  const { getSettings } = usePayrollSettings();

  const handleSignOut = () => {
    Alert.alert("로그아웃", "로그아웃 하시겠어요?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(tabs)");
        },
      },
    ]);
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const underWageStaff = getUnderWageStaff();
  if (isLoading) return <LoadingSpinner />;

  const today = new Date();
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")} (${dayNames[today.getDay()]})`;
  const todayStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;

  const currentWorkplace = getCurrentWorkplace();
  const workplaceId = currentWorkplace?.id ?? "workplace-1";
  const payrollSettings = getSettings(workplaceId);

  // 오늘 날짜 근태 기록 (현재 사업장)
  const todayRecords = records.filter(
    (r) => r.date === todayStr && r.workplaceId === workplaceId,
  );

  // 미승인 건수 (현재 사업장)
  const pendingRecords = getPendingRecords().filter(
    (r) => r.workplaceId === workplaceId,
  );

  // 오늘 출근 완료 인원 (clockOut 있는 기록)
  const checkInDone = todayRecords.filter((r) => r.clockOut !== null).length;

  // 퇴근 누락: 출근은 했지만 clockOut이 null이고 status가 PENDING
  const missedCheckout = todayRecords.filter(
    (r) => r.clockOut === null && r.status === "PENDING",
  ).length;

  // 이번 달 인건비: CONFIRMED 기록만 합산 (세전)
  const currentYear = today.getFullYear();
  const currentMonth = String(today.getMonth() + 1).padStart(2, "0");
  const confirmedThisMonth = records.filter(
    (r) =>
      r.status === "CONFIRMED" &&
      r.workplaceId === workplaceId &&
      r.date.startsWith(`${currentYear}.${currentMonth}`),
  );
  const laborCostTotal = confirmedThisMonth.reduce((sum, r) => {
    if (!r.clockOut) return sum;
    const dateKey = r.date.replace(/\./g, "-");
    const daily = calcDailyPayroll(
      { date: dateKey, clockIn: r.clockIn, clockOut: r.clockOut, breakMinutes: r.breakMinutes },
      payrollSettings,
    );
    return sum + daily.dailyTotal;
  }, 0);

  const stats = {
    checkInDone,
    pendingCount: pendingRecords.length,
    laborCost: laborCostTotal.toLocaleString(),
    missedCheckout,
  };

  // 현재 사업장 재직 직원 → 오늘 상태 계산
  const activeStaff = getActiveStaffByWorkplace(workplaceId);
  const quickStaff = activeStaff.map((s) => {
    const rec = todayRecords.find((r) => r.staffName === s.name);
    let status: string;
    if (!rec) {
      status = "출근전";
    } else if (rec.clockOut === null) {
      status = rec.status === "PENDING" ? "근무중" : "퇴근누락";
    } else {
      status = "퇴근";
    }
    return { id: s.id, name: s.name, initial: s.initial, status, hourlyWage: s.hourlyWage };
  });

  // 이번 주 주휴수당 발생 직원: 이번 주 CONFIRMED 실근무 합계 ≥ 900분
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1); // 이번 주 월요일
  const weekStartStr = `${weekStart.getFullYear()}.${String(weekStart.getMonth() + 1).padStart(2, "0")}.${String(weekStart.getDate()).padStart(2, "0")}`;
  const holidayAlertStaff = activeStaff.filter((s) => {
    const weekMins = records
      .filter(
        (r) =>
          r.staffName === s.name &&
          r.workplaceId === workplaceId &&
          r.status === "CONFIRMED" &&
          r.date >= weekStartStr &&
          r.date <= todayStr,
      )
      .reduce((sum, r) => sum + r.actualWorkMinutes, 0);
    return weekMins >= 900; // 15시간 이상
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>

        {/* ── 헤더 ── */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.storeName}>{currentWorkplace?.name ?? "사업장"}</Text>
            <Text style={styles.dateText}>{dateStr}</Text>
          </View>
          <TouchableOpacity
            style={styles.pendingBadge}
            onPress={() => router.push("/approval")}
          >
            <Text style={styles.pendingBadgeText}>미승인 {stats.pendingCount}건</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Text style={styles.signOutText}>로그아웃</Text>
          </TouchableOpacity>
        </View>

        {/* ── 히어로 카드 ── */}
        <TouchableOpacity
          style={styles.heroCard}
          onPress={() => router.push("/payroll")}
          activeOpacity={0.85}
        >
          <Text style={styles.heroLabel}>이번 달 인건비</Text>
          <Text style={styles.heroAmount}>{stats.laborCost}원</Text>
          <View style={styles.heroChips}>
            <TouchableOpacity
              style={styles.heroChip}
              onPress={(e) => { e.stopPropagation(); router.push("/approval"); }}
            >
              <Text style={styles.heroChipText}>출근완료 {stats.checkInDone}명</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.heroChip, styles.heroChipWarn]}
              onPress={(e) => { e.stopPropagation(); router.push("/approval"); }}
            >
              <Text style={[styles.heroChipText, styles.heroChipWarnText]}>미승인 {stats.pendingCount}건</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* ── AI 알림: 주휴수당 발생 직원 ── */}
        {holidayAlertStaff.map((s) => (
          <View key={s.id} style={[styles.aiCard, { backgroundColor: "#FFF0F0", borderColor: "#FECACA" }]}>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>AI</Text>
            </View>
            <Text style={styles.aiText}>
              {s.name} 님 이번 주 근무 15시간 초과 → 주휴수당이 발생합니다. 급여 확인이 필요해요.
            </Text>
          </View>
        ))}
        {underWageStaff.length > 0 && (
          <View style={[styles.aiCard, { backgroundColor: palette.yellow, borderColor: "#FDE68A" }]}>
            <View style={[styles.aiBadge, { backgroundColor: "#F59E0B" }]}>
              <Text style={styles.aiBadgeText}>⚠</Text>
            </View>
            <Text style={[styles.aiText, { color: "#92400E" }]}>
              최저시급 미달 직원 {underWageStaff.length}명이 있어요.
              시급을 {formatMoney(CURRENT_MINIMUM_WAGE)} 이상으로 수정해주세요.
            </Text>
          </View>
        )}

        {/* ── 오늘 처리할 일 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>오늘 처리할 일</Text>
          <TouchableOpacity
            style={styles.taskRow}
            onPress={() => router.push("/approval")}
            activeOpacity={0.7}
          >
            <View style={[styles.taskDot, { backgroundColor: "#EF4444" }]} />
            <Text style={styles.taskLabel}>퇴근 누락</Text>
            <View style={styles.taskBtn}>
              <Text style={styles.taskBtnText}>{stats.missedCheckout}건 처리하기 →</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.taskRow}
            onPress={() => router.push("/approval")}
            activeOpacity={0.7}
          >
            <View style={[styles.taskDot, { backgroundColor: "#F59E0B" }]} />
            <Text style={styles.taskLabel}>승인 대기</Text>
            <View style={[styles.taskBtn, { borderColor: "#F59E0B" }]}>
              <Text style={[styles.taskBtnText, { color: "#F59E0B" }]}>{stats.pendingCount}건 처리하기 →</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── 사업장 설정 링크 ── */}
        <TouchableOpacity
          style={styles.workplaceSettingsBtn}
          onPress={() => router.push(`/workplace-settings?workplaceId=${workplaceId}`)}
          activeOpacity={0.75}
        >
          <Text style={styles.workplaceSettingsBtnText}>⚙ {currentWorkplace?.name ?? "사업장"} 설정</Text>
          <Text style={styles.workplaceSettingsArrow}>›</Text>
        </TouchableOpacity>

        {/* ── 빠른 설정 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>빠른 설정</Text>
          <TouchableOpacity
            style={styles.taskRow}
            onPress={() => router.push(`/owner-payroll-settings?workplaceId=${workplaceId}`)}
            activeOpacity={0.7}
          >
            <View style={[styles.taskDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.taskLabel}>급여 계산 설정</Text>
            <View style={[styles.taskBtn, { borderColor: colors.primary }]}>
              <Text style={[styles.taskBtnText, { color: colors.primary }]}>설정하기 →</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.taskRow}
            onPress={() => router.push(`/owner-invite?workplaceId=${workplaceId}`)}
            activeOpacity={0.7}
          >
            <View style={[styles.taskDot, { backgroundColor: "#8B5CF6" }]} />
            <Text style={styles.taskLabel}>직원 초대</Text>
            <View style={[styles.taskBtn, { borderColor: "#8B5CF6" }]}>
              <Text style={[styles.taskBtnText, { color: "#8B5CF6" }]}>코드 발급 →</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── 직원 상세 내역 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>직원 상세 내역</Text>
          <View style={styles.quickGrid}>
            {quickStaff.map((staff, i) => {
              const cfg = statusConfig[staff.status] ?? statusConfig["출근전"];
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.quickCard, { backgroundColor: cfg.bg }]}
                  onPress={() =>
                    router.push(
                      `/payroll-detail?staffId=${staff.id}&staffName=${encodeURIComponent(staff.name)}&hourlyWage=${staff.hourlyWage}`,
                    )
                  }
                  activeOpacity={0.75}
                >
                  <View style={styles.quickAvatarRow}>
                    <View style={[styles.quickAvatar, { backgroundColor: cfg.dot + "33" }]}>
                      <Text style={[styles.quickAvatarText, { color: cfg.dot }]}>
                        {staff.initial}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.quickName}>{staff.name}</Text>
                  <View style={styles.quickStatusRow}>
                    <Text style={[styles.quickStatusIcon, { color: cfg.dot }]}>{cfg.icon} </Text>
                    <Text style={[styles.quickStatusText, { color: cfg.dot }]}>{cfg.label}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── 추가 사업장 등록 ── */}
        <TouchableOpacity
          style={styles.addWorkplaceBtn}
          onPress={() => router.push("/register-workplace?mode=add")}
          activeOpacity={0.8}
        >
          <Text style={styles.addWorkplaceBtnText}>＋ 새 사업장 추가</Text>
        </TouchableOpacity>

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ── 하단 탭바 (OwnerTabBar 공용 컴포넌트) ── */}
      <OwnerTabBar activeTab="home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: "#EEF2F8" },
  scroll:     { flex: 1, paddingHorizontal: 16 },

  // 헤더
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 16,
  },
  storeName:  { fontSize: 20, fontWeight: "700", color: "#1E293B" },
  dateText:   { fontSize: 13, color: "#64748B", marginTop: 2 },
  pendingBadge: {
    backgroundColor: "#FEF9C3",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#FDE047",
  },
  pendingBadgeText: { fontSize: 13, fontWeight: "600", color: "#A16207" },

  // 히어로 카드
  heroCard: {
    backgroundColor: "#3F7FF5",
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    ...shadows.button,
  },
  heroLabel: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 6 },
  heroAmount: { fontSize: 30, fontWeight: "800", color: "#FFFFFF", marginBottom: 14 },
  heroChips: { flexDirection: "row", gap: 8 },
  heroChip: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  heroChipWarn: { backgroundColor: "rgba(254,243,199,0.35)" },
  heroChipText: { fontSize: 12, fontWeight: "600", color: "#FFFFFF" },
  heroChipWarnText: { color: "#FEF9C3" },

  // AI 알림
  aiCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    gap: 10,
    ...shadows.card,
  },
  aiBadge: {
    backgroundColor: "#EF4444",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 1,
  },
  aiBadgeText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
  aiText:      { flex: 1, fontSize: 13, color: "#7F1D1D", lineHeight: 20 },

  // 처리할 일 섹션
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    ...shadows.card,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1A2540", marginBottom: 12 },
  taskRow:  { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  taskDot:  { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  taskLabel:{ flex: 1, fontSize: 14, color: "#1E293B", fontWeight: "500" },
  taskBtn:  {
    borderWidth: 1,
    borderColor: "#EF4444",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  taskBtnText: { fontSize: 12, fontWeight: "600", color: "#EF4444" },
  divider:  { height: 1, backgroundColor: "#F1F5F9" },

  // 직원 빠른 보기 그리드
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickCard: {
    width: "47.5%",
    borderRadius: 14,
    padding: 14,
    ...shadows.card,
  },
  quickAvatarRow: { marginBottom: 8 },
  quickAvatar:    {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  quickAvatarText:  { fontSize: 16, fontWeight: "700" },
  quickName:        { fontSize: 14, fontWeight: "600", color: "#1E293B", marginBottom: 4 },
  quickStatusRow:   { flexDirection: "row", alignItems: "center" },
  quickStatusIcon:  { fontSize: 10 },
  quickStatusText:  { fontSize: 12, fontWeight: "500" },

  workplaceSettingsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    ...shadows.card,
  },
  workplaceSettingsBtnText: { fontSize: 14, fontWeight: "600", color: "#1E293B" },
  workplaceSettingsArrow:   { fontSize: 20, color: "#94A3B8", fontWeight: "600" },

  addWorkplaceBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: "dashed",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 14,
    backgroundColor: colors.primaryDim,
  },
  addWorkplaceBtnText: { fontSize: 14, fontWeight: "600", color: colors.primary },
  signOutBtn: { marginLeft: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  signOutText: { fontSize: 12, color: colors.text2 },
});
