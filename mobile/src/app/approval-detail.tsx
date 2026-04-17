import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, shadows } from "../constants/theme";
import { CURRENT_MINIMUM_WAGE } from "./constants/minimumWage";
import { useAttendance } from "./store/attendanceStore";

export default function ApprovalDetailScreen() {
  const { approveRecord, rejectRecord, getPendingRecords, updateRecord } = useAttendance();
  const { recordId } = useLocalSearchParams<{ recordId: string }>();

  const [record, setRecord] = useState<any>(null);
  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");
  const [breakMinutes, setBreakMinutes] = useState(60);
  const [reason, setReason] = useState("");
  const [workMinutes, setWorkMinutes] = useState(0);
  const [basicPay, setBasicPay] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // 시급 (동적으로 가져오기)
  const HOURLY_WAGE = CURRENT_MINIMUM_WAGE;

  // 시간 형식 검증 (HH:MM, 00:00~23:59)
  const isValidTime = (t: string): boolean => {
    if (!/^\d{2}:\d{2}$/.test(t)) return false;
    const [h, m] = t.split(":").map(Number);
    return h! >= 0 && h! <= 23 && m! >= 0 && m! <= 59;
  };

  // 실 근무시간 계산 (자정 넘기는 야간 근무 처리)
  const calcWorkMinutes = (
    clockInStr: string,
    clockOutStr: string,
    breakMin: number,
  ) => {
    if (!isValidTime(clockInStr) || !isValidTime(clockOutStr)) return 0;
    const [inH, inM] = clockInStr.split(":").map(Number);
    const [outH, outM] = clockOutStr.split(":").map(Number);
    const inMins = inH! * 60 + inM!;
    let outMins = outH! * 60 + outM!;
    if (outMins < inMins) outMins += 1440; // 자정 넘기는 야간 근무
    return Math.max(0, outMins - inMins - breakMin);
  };

  // 기본급 계산
  const calcBasicPay = (workMin: number, hourlyWage: number) => {
    return Math.floor((workMin / 60) * hourlyWage);
  };

  // 근무시간 포맷
  const formatWorkTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}시간 ${mins.toString().padStart(2, "0")}분`;
  };

  // 시간 변경 시 자동 계산
  useEffect(() => {
    if (clockIn && clockOut) {
      const workMin = calcWorkMinutes(clockIn, clockOut, breakMinutes);
      const pay = calcBasicPay(workMin, HOURLY_WAGE);
      setWorkMinutes(workMin);
      setBasicPay(pay);
    }
  }, [clockIn, clockOut, breakMinutes, HOURLY_WAGE]);

  // 초기 데이터 로드
  useEffect(() => {
    const pendingRecords = getPendingRecords();
    const targetRecord = pendingRecords.find((r) => r.id === recordId);

    if (targetRecord) {
      setRecord(targetRecord);
      setClockIn(targetRecord.clockIn || "");
      setClockOut(targetRecord.clockOut || "");
      setReason(targetRecord.modifyRequest?.reason || "");
    }
  }, [recordId, getPendingRecords]);

  const handleApprove = () => {
    Alert.alert("승인 확인", "수정된 근태를 승인하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "승인",
        onPress: () => {
          approveRecord(recordId);
          Alert.alert("완료", "근태가 승인되었습니다.");
          router.back();
        },
      },
    ]);
  };

  const handleReject = () => {
    Alert.alert("반려 확인", "이 근태를 반려하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "반려",
        onPress: async () => {
          await rejectRecord(recordId);
          Alert.alert("완료", "근태가 반려되었습니다.");
          router.back();
        },
      },
    ]);
  };

  const handleSave = async () => {
    if (!isValidTime(clockIn)) {
      Alert.alert("입력 오류", "출근 시각 형식이 올바르지 않습니다.\nHH:MM 형식으로 입력해주세요.");
      return;
    }
    if (!isValidTime(clockOut)) {
      Alert.alert("입력 오류", "퇴근 시각 형식이 올바르지 않습니다.\nHH:MM 형식으로 입력해주세요.");
      return;
    }
    if (workMinutes <= 0) {
      Alert.alert("입력 오류", "퇴근 시각이 출근 시각보다 빠를 수 없습니다.\n야간 근무는 자동으로 +24h 처리됩니다.");
      return;
    }
    if (!reason.trim()) {
      Alert.alert("입력 오류", "수정 사유를 입력해주세요.");
      return;
    }
    setIsSaving(true);
    try {
      await updateRecord(recordId, clockIn, clockOut, breakMinutes, reason.trim());
      Alert.alert("저장 완료", "근태 기록이 수정되었습니다.\n승인 버튼으로 최종 확정해주세요.");
      router.back();
    } catch (e) {
      Alert.alert("저장 실패", e instanceof Error ? e.message : "오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsSaving(false);
    }
  };

  const goBack = () => {
    router.back();
  };

  const getTimeAdjustment = () => {
    if (!record?.clockIn || !clockIn) return "";

    const [origH, origM] = record.clockIn.split(":").map(Number);
    const [newH, newM] = clockIn.split(":").map(Number);
    const origTotal = origH * 60 + origM;
    const newTotal = newH * 60 + newM;
    const diff = newTotal - origTotal;

    if (diff === 0) return "";
    if (diff > 0) {
      return `${record.clockIn} 입력 → ${clockIn} 적용 (+${diff}분 조정됨)`;
    } else {
      return `⚠ 적용 시각이 실제 출근보다 ${Math.abs(diff)}분 빠릅니다. 확인하세요.`;
    }
  };

  const breakOptions = [
    { label: "없음", value: 0 },
    { label: "30분", value: 30 },
    { label: "45분", value: 45 },
    { label: "60분", value: 60 },
    { label: "직접입력", value: -1 },
  ];

  if (!record) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>로딩 중...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>근태 수정 · {record.staffName}</Text>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Employee Info Card */}
        <View style={styles.employeeCard}>
          <View style={styles.employeeHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{record.staffInitial}</Text>
            </View>
            <View style={styles.employeeInfo}>
              <Text style={styles.employeeName}>{record.staffName}</Text>
              <Text style={styles.employeeDate}>{record.date}</Text>
            </View>
            <View style={styles.reviewBadge}>
              <Text style={styles.reviewBadgeText}>검토필요</Text>
            </View>
          </View>
        </View>

        {/* Clock In Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>출근 시각</Text>
          <View style={styles.timeInputContainer}>
            <TextInput
              style={styles.timeInput}
              value={clockIn}
              onChangeText={setClockIn}
              placeholder="HH:MM"
              placeholderTextColor="#8B92AA"
            />
          </View>
          <Text style={styles.originalTime}>원본: {record.clockIn}</Text>
          <Text style={styles.appliedTime}>실 적용 시각 입력: {clockIn}</Text>

          {getTimeAdjustment() && (
            <View style={styles.adjustmentBox}>
              <Text style={styles.adjustmentText}>{getTimeAdjustment()}</Text>
            </View>
          )}
        </View>

        {/* Clock Out Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>퇴근 시각</Text>
          <View style={styles.timeInputContainer}>
            <TextInput
              style={styles.timeInput}
              value={clockOut}
              onChangeText={setClockOut}
              placeholder="HH:MM"
              placeholderTextColor="#8B92AA"
            />
          </View>
          <Text style={styles.originalTime}>원본: {record.clockOut}</Text>
          {record.modifyRequest && (
            <Text style={styles.requestedTime}>
              수정 요청 시각:{" "}
              <Text style={styles.highlight}>
                {record.modifyRequest.requestedClockOut}
              </Text>
            </Text>
          )}
        </View>

        {/* Break Time Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>휴게시간 적용</Text>
          <View style={styles.breakOptionsContainer}>
            {breakOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.breakOption,
                  breakMinutes === option.value
                    ? styles.breakOptionActive
                    : null,
                ]}
                onPress={() => setBreakMinutes(option.value)}
              >
                <Text
                  style={[
                    styles.breakOptionText,
                    breakMinutes === option.value
                      ? styles.breakOptionTextActive
                      : null,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Work Time Calculation */}
        <View style={styles.calculationBox}>
          <Text style={styles.calculationTitle}>실 근무시간 계산 결과</Text>
          <Text style={styles.calculationDetail}>
            출근 {clockIn} ~ 퇴근 {clockOut} ={" "}
            {Math.floor(calcWorkMinutes(clockIn, clockOut, 0) / 60)}시간
          </Text>
          <Text style={styles.calculationDetail}>
            휴게시간 -{breakMinutes}분 = 실 근무 {formatWorkTime(workMinutes)}
          </Text>
          <Text style={styles.calculationPay}>
            예상 기본급: {basicPay.toLocaleString()}원
          </Text>
          <Text style={styles.calculationFormula}>
            계산식: Math.floor({workMinutes}분 / 60 * {HOURLY_WAGE}원)
          </Text>
        </View>

        {/* Reason Input */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>수정 사유</Text>
          <TextInput
            style={styles.reasonInput}
            value={reason}
            onChangeText={setReason}
            placeholder="수정 사유를 입력하세요"
            placeholderTextColor="#8B92AA"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Audit Trail Notice */}
        <View style={styles.auditBox}>
          <Text style={styles.auditText}>
            ⚠ 수정 이력이 자동으로 기록됩니다.
            {"\n"}수정 전/후 시각, 사유, 수정자 ID가 저장돼요.
          </Text>
        </View>
      </ScrollView>

      {/* Fixed Bottom Buttons */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.rejectButton} onPress={handleReject}>
          <Text style={styles.rejectButtonText}>반려</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, isSaving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>{isSaving ? "저장 중..." : "수정저장"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.approveButton} onPress={handleApprove}>
          <Text style={styles.approveButtonText}>승인</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingText: {
    color: colors.text,
    textAlign: "center",
    marginTop: 100,
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
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  employeeCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
    ...shadows.card,
  },
  employeeHeader: {
    flexDirection: "row",
    alignItems: "center",
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
    color: colors.surface,
    fontSize: 18,
    fontWeight: "600",
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
  employeeDate: {
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
    color: colors.warn,
    fontSize: 10,
    fontWeight: "500",
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...shadows.card,
  },
  sectionLabel: {
    fontSize: 12,
    color: colors.text2,
    marginBottom: 12,
  },
  timeInputContainer: {
    marginBottom: 8,
  },
  timeInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    fontFamily: "monospace",
  },
  originalTime: {
    fontSize: 11,
    color: colors.text2,
    marginBottom: 4,
  },
  appliedTime: {
    fontSize: 11,
    color: colors.text,
    marginBottom: 8,
  },
  requestedTime: {
    fontSize: 11,
    color: colors.text2,
  },
  highlight: {
    color: colors.warn,
    fontWeight: "600",
  },
  adjustmentBox: {
    backgroundColor: colors.primaryDim,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  adjustmentText: {
    fontSize: 11,
    color: colors.primary,
    fontStyle: "italic",
  },
  breakOptionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  breakOption: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: "center",
  },
  breakOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  breakOptionText: {
    fontSize: 12,
    color: colors.text2,
  },
  breakOptionTextActive: {
    color: "#FFFFFF",
  },
  calculationBox: {
    backgroundColor: colors.primaryDim,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...shadows.card,
  },
  calculationTitle: {
    fontSize: 12,
    color: colors.primary,
    marginBottom: 8,
  },
  calculationDetail: {
    fontSize: 11,
    color: colors.text2,
    marginBottom: 4,
  },
  calculationPay: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: 4,
  },
  calculationFormula: {
    fontSize: 10,
    color: colors.text2,
    fontStyle: "italic",
  },
  reasonInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: "top",
  },
  auditBox: {
    backgroundColor: colors.warnDim,
    borderWidth: 1,
    borderColor: colors.warn,
    borderRadius: 10,
    padding: 12,
    marginBottom: 100, // Space for bottom buttons
  },
  auditText: {
    fontSize: 11,
    color: colors.warn,
    lineHeight: 16,
  },
  bottomActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 8,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: colors.danger,
    borderRadius: 14,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
  },
  rejectButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  saveButton: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  approveButton: {
    flex: 1,
    backgroundColor: colors.success,
    borderRadius: 14,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
  },
  approveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
