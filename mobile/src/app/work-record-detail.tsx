import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, shadows } from "../constants/theme";

type RequestType = "출근 누락" | "퇴근 누락" | "휴게시간 수정" | "기타";

function fmtMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

export default function WorkRecordDetailScreen() {
  const router = useRouter();
  const p = useLocalSearchParams<{
    fullDate: string;
    displayDate: string;
    day: string;
    clockIn: string;
    clockOut: string;
    workMinutes: string;
    breakMinutes: string;
    actualMinutes: string;
    amount: string;
    status: string;
    approvedAt: string;
    approvedBy: string;
    memo: string;
  }>();

  const [showModify, setShowModify] = useState(false);
  const [requestType, setRequestType] = useState<RequestType>("출근 누락");
  const [requestContent, setRequestContent] = useState("");

  const breakMin = parseInt(p.breakMinutes ?? "0");
  const actualMin = parseInt(p.actualMinutes ?? "0");
  const amount = parseInt(p.amount ?? "0");
  const isConfirmed = p.status === "CONFIRMED";

  // 기본급 = actualMin 기준, 연장수당 = 나머지
  const HOURLY_WAGE = 10030;
  const basicPay = Math.floor((actualMin / 60) * HOURLY_WAGE);
  const overtimePay = Math.max(0, amount - basicPay);

  const handleSubmitRequest = () => {
    if (!requestContent.trim()) {
      Alert.alert("알림", "상세 내용을 입력해주세요.");
      return;
    }
    setShowModify(false);
    setRequestContent("");
    setTimeout(() => {
      Alert.alert(
        "요청 완료",
        "수정 요청이 접수됐어요.\n사장님 확인 후 처리돼요.",
      );
    }, 300);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerDate}>
            {p.displayDate} {p.day}
          </Text>
          <Text style={styles.headerSubtitle}>근무 기록 상세</Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            isConfirmed ? styles.badgeConfirmed : styles.badgePending,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              isConfirmed ? styles.statusTextConfirmed : styles.statusTextPending,
            ]}
          >
            {isConfirmed ? "승인 완료" : "승인 대기"}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 근무 시간 카드 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>근무 시간</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>출근</Text>
            <Text style={styles.infoValueBlue}>{p.clockIn}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>퇴근</Text>
            <Text style={styles.infoValueBlue}>{p.clockOut}</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>휴게 시간</Text>
            <Text style={styles.infoValue}>
              {breakMin > 0 ? `${breakMin}분` : "없음"}
            </Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>실 근무시간</Text>
            <Text style={styles.infoValueStrong}>{fmtMin(actualMin)}</Text>
          </View>
        </View>

        {/* 수당 내역 카드 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>수당 내역</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>기본급</Text>
            <Text style={styles.infoValue}>{basicPay.toLocaleString()}원</Text>
          </View>

          {overtimePay > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>연장수당</Text>
                <Text style={styles.infoValueWarn}>
                  {overtimePay.toLocaleString()}원
                </Text>
              </View>
            </>
          )}

          <View style={styles.divider} />
          <View style={[styles.infoRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>이 날 급여 합계</Text>
            <Text style={styles.totalValue}>{amount.toLocaleString()}원</Text>
          </View>
        </View>

        {/* 승인 정보 카드 (승인된 경우) */}
        {isConfirmed && (p.approvedAt || p.approvedBy || p.memo) ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>승인 정보</Text>

            {p.approvedAt ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>승인 일시</Text>
                <Text style={styles.infoValue}>{p.approvedAt}</Text>
              </View>
            ) : null}

            {p.approvedBy ? (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>승인자</Text>
                  <Text style={styles.infoValueStrong}>{p.approvedBy}</Text>
                </View>
              </>
            ) : null}

            {p.memo ? (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>메모</Text>
                  <Text style={styles.infoValue}>{p.memo}</Text>
                </View>
              </>
            ) : null}
          </View>
        ) : null}

        {/* 수정 요청 버튼 */}
        <TouchableOpacity
          style={styles.modifyBtn}
          onPress={() => setShowModify(true)}
        >
          <Text style={styles.modifyBtnText}>수정 요청하기</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ─── 수정 요청 Modal ─── */}
      <Modal
        visible={showModify}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModify(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalSheet} edges={["bottom"]}>
            {/* Modal 헤더 */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalBack}
                onPress={() => setShowModify(false)}
              >
                <Text style={styles.modalBackText}>‹ 수정 요청</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* 날짜 */}
              <Text style={styles.fieldLabel}>날짜 선택</Text>
              <View style={styles.dateDisplay}>
                <Text style={styles.dateDisplayText}>{p.fullDate}</Text>
              </View>

              {/* 요청 유형 */}
              <Text style={[styles.fieldLabel, { marginTop: 20 }]}>
                요청 유형
              </Text>
              {(
                [
                  "출근 누락",
                  "퇴근 누락",
                  "휴게시간 수정",
                  "기타",
                ] as RequestType[]
              ).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={styles.radioRow}
                  onPress={() => setRequestType(type)}
                >
                  <View
                    style={[
                      styles.radio,
                      requestType === type && styles.radioActive,
                    ]}
                  >
                    {requestType === type && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <Text style={styles.radioLabel}>{type}</Text>
                </TouchableOpacity>
              ))}

              {/* 내용 입력 */}
              <Text style={[styles.fieldLabel, { marginTop: 20 }]}>
                내용 입력
              </Text>
              <TextInput
                style={styles.textArea}
                value={requestContent}
                onChangeText={setRequestContent}
                placeholder="상세 내용을 입력해주세요"
                placeholderTextColor={colors.text3}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <View style={{ height: 24 }} />
            </ScrollView>

            {/* 제출 버튼 */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmitRequest}
            >
              <Text style={styles.submitBtnText}>요청 보내기</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// 스타일
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  // 헤더
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  backArrow: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: "600",
  },
  headerCenter: {
    alignItems: "center",
  },
  headerDate: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.text2,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  badgeConfirmed: {
    backgroundColor: colors.successDim,
  },
  badgePending: {
    backgroundColor: "#FEF3C7",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusTextConfirmed: {
    color: colors.success,
  },
  statusTextPending: {
    color: "#92400E",
  },
  // 스크롤 컨텐츠
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  // 카드
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text2,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.text2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
  },
  infoValueBlue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
  infoValueStrong: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  infoValueWarn: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.warn,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  // 수정 요청 버튼
  modifyBtn: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  modifyBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text2,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 8,
  },
  modalBack: {
    paddingVertical: 4,
  },
  modalBackText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  modalBody: {
    flex: 0,
    maxHeight: 440,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.text2,
    marginBottom: 8,
  },
  dateDisplay: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateDisplayText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: "500",
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  radioActive: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  radioLabel: {
    fontSize: 15,
    color: colors.text,
  },
  textArea: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: colors.text,
    minHeight: 100,
    lineHeight: 20,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.surface,
  },
});
