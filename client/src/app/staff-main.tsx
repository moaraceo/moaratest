import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, shadows } from "../constants/theme";
import StaffTabBar from "./components/common/StaffTabBar";
import { CURRENT_MINIMUM_WAGE } from "./constants/minimumWage";
import { useAttendance } from "./store/attendanceStore";
import { useStaff } from "./store/staffStore";

export default function StaffMainScreen() {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const router = useRouter();
  const { clockIn, clockOut, getTodayRecord } = useAttendance();
  const { staffList } = useStaff();
  const [showMessage, setShowMessage] = useState<string>("");
  const [currentWorkMinutes, setCurrentWorkMinutes] = useState<number>(0);
  const [showClockOutModal, setShowClockOutModal] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [elapsedTime, setElapsedTime] = useState({
    hours: 0,
    minutes: 0,
    totalMinutes: 0,
  });

  // 현재 로그인한 직원 정보 찾기 (지금은 샘플로 "김민지" 기준)
  const currentStaff =
    staffList.find((s) => s.name === "김민지") ?? staffList[0];
  const wage = currentStaff?.hourlyWage ?? CURRENT_MINIMUM_WAGE;

  // 오늘 근무 기록 가져오기
  const todayRecord = getTodayRecord("김민지");
  const isClockedIn =
    todayRecord && todayRecord.clockIn && !todayRecord.clockOut;
  const isWorkComplete = todayRecord && todayRecord.clockOut;

  // 근무시간 실시간 계산
  useEffect(() => {
    if (isClockedIn && todayRecord?.clockIn) {
      const interval = setInterval(() => {
        const now = new Date();
        const [hours, minutes] = todayRecord.clockIn.split(":").map(Number);
        const clockInTime = new Date();
        clockInTime.setHours(hours, minutes, 0, 0);

        const diffMs = now.getTime() - clockInTime.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        setCurrentWorkMinutes(diffMinutes);
      }, 60000); // 1분마다 업데이트

      return () => clearInterval(interval);
    }
  }, [isClockedIn, todayRecord]);

  // 메시지 표시 함수
  const showMessageTemporarily = (message: string) => {
    setShowMessage(message);
    setTimeout(() => setShowMessage(""), 1000);
  };

  // 근무시간 계산
  const calcElapsedTime = (clockInTime: string) => {
    const [inH, inM] = clockInTime.split(":").map(Number);
    const now = new Date();
    const totalMinutes =
      now.getHours() * 60 + now.getMinutes() - (inH * 60 + inM);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return { hours, minutes, totalMinutes };
  };

  // 현재 시각 업데이트
  const getCurrentTimeString = (): string => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  // 모달이 열린 상태에서 실시간 업데이트
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (showClockOutModal && todayRecord?.clockIn) {
      // 즉시 업데이트
      const elapsed = calcElapsedTime(todayRecord.clockIn);
      setElapsedTime(elapsed);
      setCurrentTime(getCurrentTimeString());

      // 1초마다 업데이트
      interval = setInterval(() => {
        setElapsedTime(calcElapsedTime(todayRecord.clockIn));
        setCurrentTime(getCurrentTimeString());
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showClockOutModal, todayRecord?.clockIn]);

  // 근무시간 포맷
  const formatWorkTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins.toString().padStart(2, "0")}m`;
  };

  // 예상 기본급 계산
  const calculateBasicPay = (workMinutes: number): number => {
    return Math.floor((workMinutes / 60) * wage);
  };

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
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

  const handleCheckIn = () => {
    if (isClockedIn && todayRecord) {
      // 퇴근 처리 - 모달 표시
      setShowClockOutModal(true);
    } else {
      // 출근 처리
      clockIn("김민지", "김");
      showMessageTemporarily("출근이 기록됐어요 ✓");
    }
  };

  const handleClockOutConfirm = () => {
    if (todayRecord) {
      clockOut(todayRecord.id);
      setShowClockOutModal(false);
      showMessageTemporarily("퇴근이 기록됐어요 ✓");
    }
  };

  const handleClockOutCancel = () => {
    setShowClockOutModal(false);
  };

  const navigateToPayslip = () => {
    router.push("/payslip");
  };

  const navigateToWorkHistory = () => {
    router.push("/work-history");
  };

  const navigateToProfile = () => {
    router.push("/profile");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.dropdown}>
            <Text style={styles.storeName}>카페 A 매장 🔽</Text>
          </TouchableOpacity>
          <Text style={styles.userName}>김민지님</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Text style={styles.notificationIcon}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* GPS Authentication Status */}
        <View style={styles.gpsStatus}>
          <Animated.View
            style={[
              styles.gpsRing,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
          <View style={styles.gpsDot} />
          <Text style={styles.gpsText}>
            {isClockedIn ? "근무중 ●" : "GPS 인증"}
          </Text>
          {!isClockedIn && (
            <Text style={styles.gpsSubtext}>위치 확인 완료</Text>
          )}
          {isClockedIn && (
            <Text style={styles.workTimeText}>
              {formatWorkTime(currentWorkMinutes)}
            </Text>
          )}
        </View>

        {/* Check In/Out Button */}
        {!isWorkComplete ? (
          <TouchableOpacity
            style={[
              styles.checkInButton,
              isClockedIn ? styles.checkOutButton : null,
            ]}
            onPress={handleCheckIn}
          >
            <View style={styles.shimmerLine} />
            <Text style={styles.checkInTitle}>
              {isClockedIn ? "퇴 근" : "출 근"}
            </Text>
            <Text style={styles.checkInSubtext}>
              {isClockedIn ? "탭하여 퇴근 기록" : "탭하여 출근 기록"}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.workCompleteStatus}>
            <Text style={styles.workCompleteText}>✓ 오늘 근무 완료</Text>
            <Text style={styles.totalWorkTime}>
              총 {formatWorkTime(todayRecord?.workMinutes || 0)} 근무했어요
            </Text>
          </View>
        )}

        {/* Success Message */}
        {showMessage ? (
          <View style={styles.successMessage}>
            <Text style={styles.successMessageText}>{showMessage}</Text>
          </View>
        ) : null}

        {/* Clock Out Confirmation Modal */}
        <Modal
          visible={showClockOutModal}
          transparent={true}
          animationType="fade"
          onRequestClose={handleClockOutCancel}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalIcon}>⏰</Text>
                <Text style={styles.modalTitle}>퇴근하시겠어요?</Text>
              </View>

              <View style={styles.modalDivider} />

              {/* Information Rows */}
              <View style={styles.infoContainer}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>출근 시각</Text>
                  <Text style={styles.infoValue}>{todayRecord?.clockIn}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>현재 시각</Text>
                  <Text style={styles.infoValue}>{currentTime}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>근무시간</Text>
                  <Text
                    style={[
                      styles.workTimeValue,
                      elapsedTime.totalMinutes < 5
                        ? styles.warningWorkTime
                        : null,
                    ]}
                  >
                    {formatWorkTime(elapsedTime.totalMinutes)}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>예상 기본급</Text>
                  <View style={styles.payContainer}>
                    <Text style={styles.payValue}>
                      {calculateBasicPay(
                        elapsedTime.totalMinutes,
                      ).toLocaleString()}
                    </Text>
                    <Text style={styles.payUnit}>원 (세전)</Text>
                  </View>
                </View>
              </View>

              <View style={styles.modalDivider} />

              {/* Modal Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClockOutCancel}
                >
                  <Text style={styles.cancelButtonText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleClockOutConfirm}
                >
                  <Text style={styles.confirmButtonText}>퇴근 완료</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Weekly Work Status */}
        <View style={styles.weeklyStatus}>
          <View style={styles.weeklyHeader}>
            <Text style={styles.weeklyLabel}>누적 근무시간</Text>
            <Text style={styles.weeklyHours}>12h / 15h</Text>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <View style={[styles.progressFill, { width: "80%" }]} />
            </View>
          </View>
          <View style={styles.milestones}>
            <Text style={styles.milestone}>0h</Text>
            <Text style={styles.milestoneHighlight}>▲ 주휴수당 기준 15h</Text>
            <Text style={styles.milestone}>20h</Text>
          </View>
        </View>
      </ScrollView>

      <StaffTabBar activeTab="workplace" />
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
  headerLeft: {
    flexDirection: "column",
  },
  dropdown: {
    marginBottom: 4,
  },
  storeName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  userName: {
    fontSize: 12,
    color: colors.text2,
  },
  notificationButton: {
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
  scrollView: {
    paddingHorizontal: 20,
  },
  gpsStatus: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 32,
  },
  gpsRing: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: colors.primary,
    opacity: 0.3,
  },
  gpsDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    marginBottom: 16,
  },
  gpsText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  gpsSubtext: {
    fontSize: 12,
    color: colors.text2,
  },
  workTimeText: {
    fontSize: 14,
    color: colors.success,
    fontWeight: "600",
    marginTop: 4,
  },
  checkInButton: {
    height: 130,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 3,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
    position: "relative",
  },
  checkOutButton: {
    backgroundColor: colors.warn,
    shadowColor: colors.success,
    borderWidth: 3,
    borderColor: colors.success,
  },
  shimmerLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  workCompleteStatus: {
    height: 130,
    borderRadius: 24,
    backgroundColor: colors.success,
    borderWidth: 3,
    borderColor: colors.success,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  workCompleteText: {
    fontSize: 24,
    fontWeight: "600",
    color: colors.surface,
    marginBottom: 8,
  },
  totalWorkTime: {
    fontSize: 14,
    color: colors.text2,
  },
  successMessage: {
    backgroundColor: colors.successDim,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 24,
  },
  successMessageText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: "600",
  },
  // Modal Styles
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 24,
    width: "80%",
    maxWidth: 320,
    ...shadows.card,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  modalIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
  },
  modalDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  infoContainer: {
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 14,
    color: colors.text2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  workTimeValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  warningWorkTime: {
    color: colors.warn,
  },
  payContainer: {
    alignItems: "flex-end",
  },
  payValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  payUnit: {
    fontSize: 12,
    color: colors.text2,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    color: colors.text2,
    fontWeight: "500",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: colors.success,
    borderRadius: 12,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.surface,
  },
  checkInTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: colors.surface,
    marginBottom: 4,
  },
  checkInSubtext: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
  },
  weeklyHours: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: "monospace",
  },
  weeklyStatus: {
    marginBottom: 24,
  },
  weeklyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  weeklyLabel: {
    fontSize: 14,
    color: colors.text2,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBackground: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "linear-gradient(90deg, #2563EB 0%, #8B5CF6 100%)",
    borderRadius: 4,
  },
  milestones: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  milestone: {
    fontSize: 10,
    color: colors.text2,
  },
  milestoneHighlight: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: "500",
  },
  moaraGuide: {
    backgroundColor: colors.primaryDim,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    ...shadows.card,
  },
  guideIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  guideText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  guideHighlight: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
  },
  summaryContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    ...shadows.card,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.text2,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  summaryUnit: {
    fontSize: 12,
    color: colors.text2,
  },
});
