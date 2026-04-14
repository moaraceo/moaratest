import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, shadows } from "../constants/theme";
import StaffTabBar from "./components/common/StaffTabBar";
import { useAttendance } from "./store/attendanceStore";
import { useAuth } from "./store/authStore";
import { usePayrollSettings } from "./store/payrollSettingsStore";
import { useStaff } from "./store/staffStore";
import { useWorkplace } from "./store/workplaceStore";
import { calcDailyPayroll } from "./utils/payroll";

type AttendanceState = "before" | "working" | "break_select" | "done";

const STORAGE_KEY = "@moara:today_attendance";

type StoredAttendance = {
  state: AttendanceState;
  clockIn: string | null;
  clockOut: string | null;
  breakMinutes: number;
  date: string;
};

function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  return `${y}.${m}.${d}`;
}

function getCurrentTime(): string {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export default function StaffMainScreen() {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const router = useRouter();
  const { clockIn: storeClockIn } = useAttendance();


  // ── 직원 정보 ──
  const { user } = useAuth();
  const { getSettings } = usePayrollSettings();
  const { setCurrentWorkplace, getStaffWorkplaces, currentWorkplaceId } = useWorkplace();
  const { staffList } = useStaff();

  // 사업장 전환 모달
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  // 현재 로그인 직원 — auth user.id 기준으로 매칭, 없으면 name으로 fallback
  const currentStaff =
    staffList.find((s) => s.id === user?.id) ??
    staffList.find((s) => s.name === user?.name) ??
    staffList[0];
  const myWorkplaces = getStaffWorkplaces(currentStaff?.workplaceIds ?? []);
  const activeWorkplace = myWorkplaces.find((w) => w.id === currentWorkplaceId) ?? myWorkplaces[0];

  const payrollSettings = getSettings(currentWorkplaceId ?? "workplace-1");

  // ── 근태 상태 ──
  const [attendanceState, setAttendanceState] = useState<AttendanceState>("before");
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [clockOutTime, setClockOutTime] = useState<string | null>(null);
  const [storedBreakMinutes, setStoredBreakMinutes] = useState<number>(0);

  // ── break_select UI ──
  const [selectedBreakMinutes, setSelectedBreakMinutes] = useState<number>(0);

  // ── working 실시간 카운터 ──
  const [workMinutes, setWorkMinutes] = useState<number>(0);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AsyncStorage 저장/불러오기
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const saveToStorage = async (data: StoredAttendance) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("근태 저장 실패:", e);
    }
  };

  useEffect(() => {
    const loadState = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const stored: StoredAttendance = JSON.parse(raw);
        const today = getTodayKey();

        if (stored.date !== today) {
          // 날짜가 다르면 초기화
          const reset: StoredAttendance = {
            state: "before",
            clockIn: null,
            clockOut: null,
            breakMinutes: 0,
            date: today,
          };
          await saveToStorage(reset);
          return;
        }

        setAttendanceState(stored.state);
        setClockInTime(stored.clockIn);
        setClockOutTime(stored.clockOut);
        setStoredBreakMinutes(stored.breakMinutes);
      } catch (e) {
        console.error("근태 불러오기 실패:", e);
      }
    };
    loadState();
  }, []);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GPS pulse 애니메이션
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // working 상태 실시간 카운터 (1분마다)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  useEffect(() => {
    if (attendanceState !== "working" || !clockInTime) return;

    const calc = () => {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      return Math.max(0, nowMins - timeToMinutes(clockInTime));
    };

    setWorkMinutes(calc());
    const interval = setInterval(() => setWorkMinutes(calc()), 60000);
    return () => clearInterval(interval);
  }, [attendanceState, clockInTime]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 급여 계산
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const calcPay = (ci: string, co: string, breakMins: number): number => {
    const date = getTodayKey().replace(/\./g, "-");
    return calcDailyPayroll({ date, clockIn: ci, clockOut: co, breakMinutes: breakMins }, payrollSettings).dailyTotal;
  };

  // break_select / done 총 근무시간
  const totalWorkMinutes =
    clockInTime && clockOutTime
      ? Math.max(0, timeToMinutes(clockOutTime) - timeToMinutes(clockInTime))
      : 0;

  const netMinutes = Math.max(0, totalWorkMinutes - selectedBreakMinutes);
  const doneNetMinutes = Math.max(0, totalWorkMinutes - storedBreakMinutes);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 상태 전환 핸들러
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleClockIn = () => {
    const now = getCurrentTime();
    const today = getTodayKey();
    const data: StoredAttendance = {
      state: "working",
      clockIn: now,
      clockOut: null,
      breakMinutes: 0,
      date: today,
    };
    setClockInTime(now);
    setAttendanceState("working");
    saveToStorage(data);
    storeClockIn(
      currentStaff?.name ?? user?.name ?? "",
      currentStaff?.initial ?? (user?.name?.[0] ?? ""),
      currentWorkplaceId ?? "workplace-1",
    );
  };

  const handleClockOutPress = () => {
    const now = getCurrentTime();
    const today = getTodayKey();
    const data: StoredAttendance = {
      state: "break_select",
      clockIn: clockInTime,
      clockOut: now,
      breakMinutes: 0,
      date: today,
    };
    setClockOutTime(now);
    setSelectedBreakMinutes(0);
    setAttendanceState("break_select");
    saveToStorage(data);
  };

  const handleSubmit = () => {
    if (!clockInTime || !clockOutTime) return;
    const today = getTodayKey();
    const data: StoredAttendance = {
      state: "done",
      clockIn: clockInTime,
      clockOut: clockOutTime,
      breakMinutes: selectedBreakMinutes,
      date: today,
    };
    setStoredBreakMinutes(selectedBreakMinutes);
    setAttendanceState("done");
    saveToStorage(data);

  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 휴게시간 선택 옵션
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const getBreakOptions = (): number[] => {
    if (totalWorkMinutes >= 480) return [0, 30, 60];
    if (totalWorkMinutes >= 240) return [0, 30];
    return [0];
  };

  const breakOptions = getBreakOptions();
  const show4hWarning = totalWorkMinutes >= 240 && totalWorkMinutes < 480;
  const show8hWarning = totalWorkMinutes >= 480;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GPS 점 색상
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const gpsDotColor =
    attendanceState === "working"
      ? colors.success
      : attendanceState === "break_select"
        ? colors.warn
        : attendanceState === "done"
          ? colors.text3
          : colors.primary;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* ── 사업장 전환 모달 ── */}
      <Modal
        visible={showSwitchModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSwitchModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowSwitchModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>사업장 선택</Text>
            {myWorkplaces.map((wp) => {
              const isActive = wp.id === currentWorkplaceId;
              return (
                <TouchableOpacity
                  key={wp.id}
                  style={[styles.modalItem, isActive && styles.modalItemActive]}
                  onPress={() => {
                    setCurrentWorkplace(wp.id);
                    setShowSwitchModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalItemText, isActive && styles.modalItemTextActive]}>
                    {wp.name}
                  </Text>
                  {isActive && <Text style={styles.modalItemCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── 헤더 ── */}
      <View style={styles.header}>
        <View>
          <TouchableOpacity onPress={() => setShowSwitchModal(true)}>
            <Text style={styles.storeName}>{activeWorkplace?.name ?? "사업장"} 🔽</Text>
          </TouchableOpacity>
          <Text style={styles.userName}>{currentStaff?.name ?? "직원"}님</Text>
        </View>
        <TouchableOpacity style={styles.notificationBtn}>
          <Text style={styles.notificationIcon}>🔔</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {/* ── GPS 인증 UI ── */}
        <View style={styles.gpsSection}>
          <View style={styles.gpsIndicator}>
            <Animated.View
              style={[styles.gpsRing, { transform: [{ scale: pulseAnim }] }]}
            />
            <View style={[styles.gpsDot, { backgroundColor: gpsDotColor }]} />
          </View>
          <Text style={styles.gpsLabel}>
            {attendanceState === "working" ? "근무중 ●" : "GPS 인증"}
          </Text>
          <Text style={styles.gpsSubLabel}>위치 확인 완료</Text>
          <Text style={styles.dateText}>{getTodayKey()}</Text>
        </View>

        {/* ── 정보 카드 ── */}
        <View style={styles.infoCard}>
          {/* 출근시간 */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>출근시간</Text>
            <Text style={styles.infoValue}>{clockInTime ?? "—"}</Text>
          </View>

          {/* 퇴근시간 */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>퇴근시간</Text>
            <Text
              style={[
                styles.infoValue,
                attendanceState === "working" && { color: colors.success },
              ]}
            >
              {attendanceState === "before"
                ? "—"
                : attendanceState === "working"
                  ? "근무중"
                  : (clockOutTime ?? "—")}
            </Text>
          </View>

          {/* 휴게시간 (working/break_select/done) */}
          {attendanceState !== "before" && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>휴게시간</Text>
              <Text
                style={[
                  styles.infoValue,
                  attendanceState === "working" && { color: colors.text3 },
                ]}
              >
                {attendanceState === "working"
                  ? "미선택"
                  : attendanceState === "break_select"
                    ? selectedBreakMinutes === 0
                      ? "없음"
                      : `${selectedBreakMinutes}분`
                    : storedBreakMinutes === 0
                      ? "없음"
                      : `${storedBreakMinutes}분`}
              </Text>
            </View>
          )}

          {/* 실 근무 */}
          <View style={[styles.infoRow, styles.infoRowLast]}>
            <Text style={styles.infoLabel}>실 근무</Text>
            <Text
              style={[
                styles.infoValue,
                attendanceState !== "before" && { color: colors.primary },
              ]}
            >
              {attendanceState === "before"
                ? "—"
                : attendanceState === "working"
                  ? formatTime(workMinutes)
                  : attendanceState === "break_select"
                    ? formatTime(netMinutes)
                    : formatTime(doneNetMinutes)}
            </Text>
          </View>
        </View>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* STATE: before                  */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {attendanceState === "before" && (
          <View style={styles.actionSection}>
            <TouchableOpacity style={styles.clockInBtn} onPress={handleClockIn}>
              <Text style={styles.clockInBtnText}>출근하기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.clockOutBtn, styles.btnDisabled]}
              disabled
            >
              <Text style={styles.btnDisabledText}>퇴근하기</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* STATE: working                  */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {attendanceState === "working" && (
          <View style={styles.actionSection}>
            {/* 예상 급여 카드 */}
            <View style={styles.payCard}>
              <Text style={styles.payCardLabel}>예상 급여 (세전)</Text>
              <Text style={styles.payCardAmount}>
                {calcPay(clockInTime!, getCurrentTime(), 0).toLocaleString()}
                <Text style={styles.payCardUnit}>원</Text>
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.clockInBtn, styles.btnDisabled]}
              disabled
            >
              <Text style={styles.btnDisabledText}>출근하기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.clockOutBtn}
              onPress={handleClockOutPress}
            >
              <Text style={styles.clockOutBtnText}>퇴근하기</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* STATE: break_select             */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {attendanceState === "break_select" && (
          <View style={styles.actionSection}>
            {/* 총 근무 표시 */}
            <View style={styles.totalWorkRow}>
              <Text style={styles.totalWorkLabel}>총 근무시간</Text>
              <Text style={styles.totalWorkValue}>
                {formatTime(totalWorkMinutes)}
              </Text>
            </View>

            {/* 휴게시간 선택 */}
            <View style={styles.breakCard}>
              <Text style={styles.breakTitle}>휴게시간 선택</Text>

              {show4hWarning && (
                <View style={styles.breakWarning}>
                  <Text style={styles.breakWarningText}>
                    ⚠ 4시간 이상 근무 시 30분 휴게가 의무예요
                  </Text>
                </View>
              )}
              {show8hWarning && (
                <View style={styles.breakWarning}>
                  <Text style={styles.breakWarningText}>
                    ⚠ 8시간 이상 근무 시 1시간 휴게가 의무예요
                  </Text>
                </View>
              )}

              <View style={styles.breakOptions}>
                {breakOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.breakOption,
                      selectedBreakMinutes === opt && styles.breakOptionActive,
                    ]}
                    onPress={() => setSelectedBreakMinutes(opt)}
                  >
                    <Text
                      style={[
                        styles.breakOptionText,
                        selectedBreakMinutes === opt &&
                          styles.breakOptionTextActive,
                      ]}
                    >
                      {opt === 0 ? "없음" : opt === 30 ? "30분" : "1시간"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 실시간 반영 카드 */}
            <View style={styles.payCard}>
              <View style={styles.payCardRow}>
                <Text style={styles.payCardLabel}>실 근무시간</Text>
                <Text style={styles.payCardNetTime}>
                  {formatTime(netMinutes)}
                </Text>
              </View>
              <View style={[styles.payCardRow, styles.payCardRowDivider]}>
                <Text style={styles.payCardLabel}>예상 급여 (세전)</Text>
                <Text style={styles.payCardAmount}>
                  {calcPay(clockInTime!, clockOutTime!, selectedBreakMinutes).toLocaleString()}
                  <Text style={styles.payCardUnit}>원</Text>
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.submitBtnText}>근무 완료 제출</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* STATE: done                     */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {attendanceState === "done" && (
          <View style={styles.actionSection}>
            {/* 급여 카드 */}
            <View style={styles.donePayCard}>
              <View style={styles.donePayHeader}>
                <Text style={styles.donePayLabel}>오늘 세전 급여</Text>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>승인 대기 중</Text>
                </View>
              </View>
              <Text style={styles.donePayAmount}>
                {calcPay(clockInTime!, clockOutTime!, storedBreakMinutes).toLocaleString()}
                <Text style={styles.donePayUnit}>원</Text>
              </Text>
              <Text style={styles.donePayNote}>사장님 승인 후 확정돼요</Text>
            </View>

            <TouchableOpacity
              style={styles.historyBtn}
              onPress={() => router.push("/work-history")}
            >
              <Text style={styles.historyBtnText}>근무이력 보기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addWorkplaceBtn}
              onPress={() => router.push("/join-workplace?mode=add")}
            >
              <Text style={styles.addWorkplaceBtnText}>＋ 다른 사업장 참여</Text>
            </TouchableOpacity>
          </View>
        )}

      </View>

      <StaffTabBar activeTab="workplace" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  // ── 헤더
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
  storeName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  userName: {
    fontSize: 12,
    color: colors.text2,
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationIcon: {
    fontSize: 18,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
  },
  // ── GPS
  gpsSection: {
    alignItems: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  gpsIndicator: {
    width: 64,
    height: 64,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  gpsRing: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.primary,
    opacity: 0.3,
  },
  gpsDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  gpsLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 3,
  },
  gpsSubLabel: {
    fontSize: 12,
    color: colors.text2,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.text2,
  },
  // ── 정보 카드
  infoCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    ...shadows.card,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.text2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  // ── 액션 영역 (공통 래퍼)
  actionSection: {
    gap: 10,
    paddingBottom: 8,
  },
  // ── 출근 버튼 (파란색)
  clockInBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.button,
  },
  clockInBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
  // ── 퇴근 버튼 (초록)
  clockOutBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.success,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  clockOutBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
  // ── 비활성 버튼
  btnDisabled: {
    backgroundColor: colors.border,
    opacity: 0.4,
    shadowOpacity: 0,
    elevation: 0,
  },
  btnDisabledText: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.text2,
  },
  // ── 예상 급여 카드 (working / break_select)
  payCard: {
    backgroundColor: colors.primaryDim,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 16,
    padding: 12,
  },
  payCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  payCardRowDivider: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  payCardLabel: {
    fontSize: 13,
    color: colors.text2,
  },
  payCardNetTime: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.primary,
  },
  payCardAmount: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.primary,
  },
  payCardUnit: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.primary,
  },
  // ── 총 근무 행 (break_select 상단)
  totalWorkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
    ...shadows.card,
  },
  totalWorkLabel: {
    fontSize: 14,
    color: colors.text2,
  },
  totalWorkValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  // ── 휴게시간 선택 카드
  breakCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
    ...shadows.card,
  },
  breakTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },
  breakWarning: {
    backgroundColor: colors.warnDim,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
  },
  breakWarningText: {
    fontSize: 13,
    color: colors.warn,
    fontWeight: "500",
  },
  breakOptions: {
    flexDirection: "row",
    gap: 10,
  },
  breakOption: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg,
  },
  breakOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryDim,
  },
  breakOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text2,
  },
  breakOptionTextActive: {
    color: colors.primary,
  },
  // ── 근무 완료 제출
  submitBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.button,
  },
  submitBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
  // ── done 급여 카드
  donePayCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    ...shadows.card,
  },
  donePayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  donePayLabel: {
    fontSize: 14,
    color: colors.text2,
  },
  pendingBadge: {
    backgroundColor: colors.warnDim,
    borderWidth: 1,
    borderColor: colors.warn,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.warn,
  },
  donePayAmount: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  donePayUnit: {
    fontSize: 18,
    fontWeight: "500",
    color: colors.text,
  },
  donePayNote: {
    fontSize: 13,
    color: colors.text2,
  },
  // ── 근무이력 보기
  historyBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  historyBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  // ── 사업장 전환 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    paddingTop: 100,
    paddingLeft: 20,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 8,
    minWidth: 220,
    ...shadows.card,
  },
  modalTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text3,
    paddingHorizontal: 16,
    paddingVertical: 10,
    letterSpacing: 0.5,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalItemActive: {
    backgroundColor: colors.primaryDim,
  },
  modalItemText: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.text,
  },
  modalItemTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  modalItemCheck: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "700",
  },

  addWorkplaceBtn: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: colors.primaryDim,
  },
  addWorkplaceBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
});
