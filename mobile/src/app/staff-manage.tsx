import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, shadows } from "../constants/theme";
import OwnerTabBar from "./components/common/OwnerTabBar";
import Toast from "./components/common/Toast";
import { CURRENT_MINIMUM_WAGE } from "./constants/minimumWage";
import { StaffMember, useStaff } from "./store/staffStore";
import { useWorkplace } from "./store/workplaceStore";
import { formatMoney } from "./utils/format";

function formatExpiry(isoString: string): string {
  const expiry = new Date(isoString);
  const diffMs = expiry.getTime() - Date.now();
  if (diffMs <= 0) return "만료됨";
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  return h >= 1 ? `${h}시간 ${m}분 후 만료` : `${m}분 후 만료`;
}

export default function StaffManageScreen() {
  const scrollViewRef = useRef<ScrollView>(null);
  const {
    staffList,
    updateStaff,
    getActiveStaff,
    getResignedStaff,
  } = useStaff();
  const { workplaces, currentWorkplaceId, generateInviteCode } = useWorkplace();

  // 메인 탭: 직원 목록 | 초대 코드
  const [mainTab, setMainTab] = useState<"staff" | "invite">("staff");

  // 초대 코드 상태
  const currentWorkplace = workplaces.find((w) => w.id === currentWorkplaceId) ?? workplaces[0];
  const [expiryText, setExpiryText] = useState(() =>
    currentWorkplace ? formatExpiry(currentWorkplace.invite_code_expiry) : "",
  );
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    if (!currentWorkplace) return;
    setExpiryText(formatExpiry(currentWorkplace.invite_code_expiry));
    const id = setInterval(() => setExpiryText(formatExpiry(currentWorkplace.invite_code_expiry)), 60000);
    return () => clearInterval(id);
  }, [currentWorkplace?.invite_code_expiry]);

  const handleRegenerate = () => {
    if (!currentWorkplace) return;
    setIsRegenerating(true);
    generateInviteCode(currentWorkplace.id);
    setTimeout(() => setIsRegenerating(false), 400);
  };

  const handleShare = async () => {
    if (!currentWorkplace) return;
    await Share.share({
      message: `[모아라] ${currentWorkplace.name} 초대 코드: ${currentWorkplace.invite_code}\n앱에서 '사업장 참여하기'를 선택하고 코드를 입력해주세요. (24시간 유효)`,
    });
  };

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "active" | "resigned"
  >("all");
  const [toast, setToast] = useState("");
  const [wageEffectiveType, setWageEffectiveType] = useState<
    "today" | "nextPayday" | "custom"
  >("today");
  const [customEffectiveDate, setCustomEffectiveDate] = useState("");

  // 오늘 날짜 문자열
  const getTodayDateStr = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    return `${year}.${month}.${day}`;
  };

  // 다음 급여일 (다음 달 1일)
  const getNextPayday = (): string => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const year = next.getFullYear();
    const month = (next.getMonth() + 1).toString().padStart(2, "0");
    return `${year}.${month}.01`;
  };

  // 필터링된 직원 목록
  const getFilteredStaff = () => {
    switch (selectedFilter) {
      case "active":
        return getActiveStaff();
      case "resigned":
        return getResignedStaff();
      default:
        return staffList;
    }
  };

  // 직원 수정 모달 열기
  const openEditModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    setWageEffectiveType("today");
    setCustomEffectiveDate("");
    setShowEditModal(true);
  };

  // 직원 정보 저장
  const handleSaveStaff = () => {
    if (!editingStaff) return;

    // 최저시급 검증
    if (editingStaff.hourlyWage < CURRENT_MINIMUM_WAGE) {
      Alert.alert(
        "시급 오류",
        `최저시급(${formatMoney(CURRENT_MINIMUM_WAGE)})보다 낮은 금액을 입력할 수 없습니다.`,
      );
      return;
    }

    let effectiveDate = getTodayDateStr();
    if (wageEffectiveType === "nextPayday") {
      effectiveDate = getNextPayday();
    } else if (wageEffectiveType === "custom") {
      effectiveDate = customEffectiveDate || getTodayDateStr();
    }

    updateStaff(currentWorkplaceId ?? "", editingStaff.userId, {
      position: editingStaff.position,
      hourlyWage: editingStaff.hourlyWage,
      status: editingStaff.status,
    });

    setToast("");
    setTimeout(() => setToast(`저장됐어요 ✓  (${effectiveDate}부터 적용)`), 0);
    setShowEditModal(false);
    setEditingStaff(null);
  };

  // 재입사 처리
  const handleRejoinStaff = (staff: StaffMember) => {
    Alert.alert("재입사 처리", `${staff.name}님을 재입사 처리하시겠습니까?`, [
      { text: "취소", style: "cancel" },
      {
        text: "재입사",
        onPress: () => {
          updateStaff(currentWorkplaceId ?? "", staff.userId, { status: "active" });
          setToast("");
          setTimeout(() => setToast("재입사 처리되었습니다."), 0);
        },
      },
    ]);
  };

  // 상태 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return colors.success;
      case "probation":
        return colors.primary;
      case "resigned":
        return colors.danger;
      default:
        return colors.text2;
    }
  };

  // 상태 배경색
  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "active":
        return colors.successDim;
      case "probation":
        return colors.primaryDim;
      case "resigned":
        return colors.dangerDim;
      default:
        return colors.surface2;
    }
  };

  // 직원 이력 텍스트
  const getStaffHistory = (staff: StaffMember) => {
    const history = [];
    if (staff.resignDate) {
      history.push(`입사 ${staff.joinDate}`);
      history.push(`퇴사 ${staff.resignDate}`);
    }
    if (staff.rejoinDate) {
      history.push(`재입사 ${staff.rejoinDate}`);
    }
    return history.join(" · ");
  };

  const filteredStaff = getFilteredStaff();

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>직원 관리</Text>
        <TouchableOpacity
          style={styles.inviteButton}
          onPress={() => setMainTab("invite")}
        >
          <Text style={styles.inviteButtonText}>+ 초대</Text>
        </TouchableOpacity>
      </View>

      {/* 메인 탭: 직원 목록 | 초대 코드 */}
      <View style={styles.mainTabs}>
        {(["staff", "invite"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.mainTab, mainTab === tab && styles.mainTabActive]}
            onPress={() => setMainTab(tab)}
          >
            <Text style={[styles.mainTabText, mainTab === tab && styles.mainTabTextActive]}>
              {tab === "staff" ? "직원 목록" : "초대 코드"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── 초대 코드 탭 ── */}
      {mainTab === "invite" && (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.inviteSection}>
            <Text style={styles.inviteWorkplaceName}>{currentWorkplace?.name}</Text>
            <Text style={styles.inviteSubtitle}>
              아래 코드를 직원에게 공유하세요.{"\n"}직원이 앱에서 입력하면 자동으로 참여돼요.
            </Text>

            {/* 코드 박스 */}
            <View style={styles.codeCard}>
              <Text style={styles.codeLabel}>초대 코드</Text>
              <View style={styles.codeRow}>
                {(currentWorkplace?.invite_code ?? "------").split("").map((ch, i) => (
                  <View key={i} style={styles.codeBox}>
                    <Text style={styles.codeChar}>{ch}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.expiryRow}>
                <View style={[styles.expiryDot, expiryText === "만료됨" && { backgroundColor: colors.danger }]} />
                <Text style={[styles.expiryText, expiryText === "만료됨" && { color: colors.danger }]}>
                  {expiryText}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
              <Text style={styles.shareBtnText}>코드 공유하기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.regenBtn, isRegenerating && { opacity: 0.6 }]}
              onPress={handleRegenerate}
              disabled={isRegenerating}
              activeOpacity={0.7}
            >
              {isRegenerating
                ? <ActivityIndicator color={colors.primary} size="small" />
                : <Text style={styles.regenBtnText}>코드 재발급 (24시간 연장)</Text>
              }
            </TouchableOpacity>

            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>
                • 코드는 발급 시점부터 24시간 유효해요{"\n"}
                • 재발급하면 이전 코드는 즉시 무효화돼요{"\n"}
                • 한 번 참여한 직원은 재입력 없이 계속 사용해요
              </Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* ── 직원 목록 탭 ── */}
      {mainTab === "staff" && (
        <>
          {/* Filter Tabs */}
          <View style={styles.filterTabs}>
            {(["all", "active", "resigned"] as const).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[styles.filterTab, selectedFilter === filter && styles.activeFilterTab]}
                onPress={() => setSelectedFilter(filter)}
              >
                <Text style={[styles.filterTabText, selectedFilter === filter && styles.activeFilterTabText]}>
                  {filter === "all" ? "전체" : filter === "active" ? "재직중" : "퇴사"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 최저시급 안내 박스 */}
          <View style={styles.minimumWageNotice}>
            <Text style={styles.minimumWageTitle}>
              2026년 최저시급: {formatMoney(CURRENT_MINIMUM_WAGE)}/h
            </Text>
            <Text style={styles.minimumWageSubtitle}>
              직원 시급이 최저시급 이상인지 확인하세요
            </Text>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {filteredStaff.map((staff) => (
          <TouchableOpacity
            key={staff.id}
            style={styles.staffCard}
            onPress={() => openEditModal(staff)}
            activeOpacity={0.7}
          >
            <View style={styles.cardLeft}>
              {/* 메인 행: 아바타 + 이름/직책/시급 + 상태뱃지 */}
              <View style={styles.staffHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{staff.initial}</Text>
                </View>
                <View style={styles.staffInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.staffName}>{staff.name}</Text>
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
                        {staff.status === "active"
                          ? "재직중"
                          : staff.status === "probation"
                            ? "수습"
                            : "퇴사"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.wageContainer}>
                    <Text style={styles.staffPosition}>{staff.position}</Text>
                    <Text style={styles.staffPositionDot}> · </Text>
                    <Text style={styles.staffWage}>
                      {formatMoney(staff.hourlyWage)}/h
                    </Text>
                    {staff.hourlyWage < CURRENT_MINIMUM_WAGE && (
                      <Text style={styles.underWageWarning}> ⚠</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* 퇴사 직원: 이력 + 재입사 버튼 */}
              {staff.status === "resigned" && (
                <View style={styles.staffHistory}>
                  <Text style={styles.historyText}>
                    {getStaffHistory(staff)}
                  </Text>
                </View>
              )}
              {staff.status === "resigned" && (
                <TouchableOpacity
                  style={styles.rejoinButton}
                  onPress={() => handleRejoinStaff(staff)}
                >
                  <Text style={styles.rejoinButtonText}>재입사 처리</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* 우측 > 버튼 */}
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                router.push({
                  pathname: "/staff-detail",
                  params: { staffId: staff.id },
                });
              }}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              style={styles.arrowBtn}
            >
              <Text style={styles.arrowText}>›</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
          </ScrollView>
        </>
      )}

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModal}>
            {/* Modal Header */}
            <Text style={styles.modalTitle}>직원 정보 수정</Text>
            <View style={styles.modalDivider} />

            {/* Name */}
            <View style={styles.modalField}>
              <Text style={styles.fieldLabel}>이름</Text>
              <Text style={styles.fieldValue}>{editingStaff?.name}</Text>
            </View>

            {/* Hourly Wage */}
            <View style={styles.modalField}>
              <Text style={styles.fieldLabel}>시급 (원)</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={editingStaff?.hourlyWage.toString()}
                  onChangeText={(text) => {
                    const wage = parseInt(text) || 0;
                    setEditingStaff((prev: StaffMember | null) =>
                      prev ? { ...prev, hourlyWage: wage } : null,
                    );
                  }}
                  keyboardType="numeric"
                  placeholder="시급 입력"
                />
                <Text style={styles.inputUnit}>원/h</Text>
              </View>

              {/* 최저시급 안내 */}
              <Text style={styles.minimumWageNote}>
                현재 최저시급: {formatMoney(CURRENT_MINIMUM_WAGE)} 이상 입력
                필요
              </Text>
              {editingStaff?.hourlyWage &&
                editingStaff.hourlyWage < CURRENT_MINIMUM_WAGE && (
                  <Text style={styles.minimumWageError}>
                    ⚠ 최저시급({formatMoney(CURRENT_MINIMUM_WAGE)})보다 낮아요
                  </Text>
                )}
            </View>

            {/* 시급 적용 시점 */}
            <View style={styles.modalField}>
              <Text style={styles.fieldLabel}>시급 적용 시점</Text>
              <View style={styles.effectiveDateButtons}>
                {(
                  [
                    { key: "today", label: "오늘부터" },
                    { key: "nextPayday", label: "다음 급여일부터" },
                    { key: "custom", label: "날짜 지정" },
                  ] as const
                ).map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.effectiveDateBtn,
                      wageEffectiveType === key &&
                        styles.activeEffectiveDateBtn,
                    ]}
                    onPress={() => setWageEffectiveType(key)}
                  >
                    <Text
                      style={[
                        styles.effectiveDateBtnText,
                        wageEffectiveType === key &&
                          styles.activeEffectiveDateBtnText,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {wageEffectiveType === "nextPayday" && (
                <Text style={styles.effectiveDateNote}>
                  다음 급여일: {getNextPayday()}
                </Text>
              )}
              {wageEffectiveType === "custom" && (
                <TextInput
                  style={[styles.textInput, { marginTop: 8 }]}
                  value={customEffectiveDate}
                  onChangeText={setCustomEffectiveDate}
                  placeholder="YYYY.MM.DD"
                  keyboardType="numeric"
                />
              )}
            </View>

            {/* Position */}
            <View style={styles.modalField}>
              <Text style={styles.fieldLabel}>직책</Text>
              <TextInput
                style={styles.textInput}
                value={editingStaff?.position}
                onChangeText={(text) => {
                  setEditingStaff((prev: StaffMember | null) =>
                    prev ? { ...prev, position: text } : null,
                  );
                }}
                placeholder="직책 입력"
              />
            </View>

            {/* Status */}
            <View style={styles.modalField}>
              <Text style={styles.fieldLabel}>재직 상태</Text>
              <View style={styles.statusButtons}>
                {(["active", "probation", "resigned"] as const).map(
                  (status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusButton,
                        editingStaff?.status === status &&
                          styles.activeStatusButton,
                      ]}
                      onPress={() => {
                        setEditingStaff((prev: StaffMember | null) =>
                          prev
                            ? {
                                ...prev,
                                status: status as StaffMember["status"],
                              }
                            : null,
                        );
                      }}
                    >
                      <Text
                        style={[
                          styles.statusButtonText,
                          editingStaff?.status === status &&
                            styles.activeStatusButtonText,
                        ]}
                      >
                        {status === "active"
                          ? "재직중"
                          : status === "probation"
                            ? "수습"
                            : "퇴사"}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>
            </View>

            <View style={styles.modalDivider} />

            {/* Modal Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveStaff}
              >
                <Text style={styles.saveButtonText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast */}
      {toast && <Toast message={toast} type="success" />}
      <OwnerTabBar activeTab="staff" />
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
  inviteButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    ...shadows.button,
  },
  inviteButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  backArrow: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
  },
  filterTabs: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterTab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeFilterTab: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.text2,
  },
  activeFilterTabText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  staffCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    ...shadows.card,
  },
  staffHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.surface,
  },
  staffInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  staffName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  staffPosition: {
    fontSize: 12,
    color: colors.text2,
  },
  staffPositionDot: {
    fontSize: 12,
    color: colors.text2,
  },
  staffWage: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  staffHistory: {
    marginTop: 4,
    paddingLeft: 38,
  },
  historyText: {
    fontSize: 10,
    color: colors.text2,
    lineHeight: 14,
  },
  rejoinButton: {
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    marginLeft: 38,
    alignSelf: "flex-start",
  },
  rejoinButtonText: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.surface,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  editModal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
    width: "100%",
    maxWidth: 400,
    ...shadows.card,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 16,
    textAlign: "center",
  },
  modalDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  modalField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    color: colors.text2,
    marginBottom: 8,
  },
  fieldValue: {
    fontSize: 14,
    color: colors.text,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
  },
  inputUnit: {
    fontSize: 14,
    color: colors.text2,
  },
  statusButtons: {
    flexDirection: "row",
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeStatusButton: {
    backgroundColor: colors.primary,
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.text2,
    textAlign: "center",
  },
  activeStatusButtonText: {
    color: colors.surface,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
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
    fontWeight: "500",
    color: colors.text2,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.surface,
  },
  cardContent: {
    flex: 1,
  },
  // 최저시급 안내 박스 스타일
  minimumWageNotice: {
    backgroundColor: colors.primaryDim,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 12,
    ...shadows.card,
  },
  minimumWageTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: 4,
  },
  minimumWageSubtitle: {
    fontSize: 12,
    color: colors.text2,
  },
  // 시급 컨테이너 스타일
  wageContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  underWageWarning: {
    fontSize: 11,
    color: colors.danger,
  },
  // 시급 적용 시점 버튼
  effectiveDateButtons: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
  },
  effectiveDateBtn: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  activeEffectiveDateBtn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  effectiveDateBtnText: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.text2,
    textAlign: "center",
  },
  activeEffectiveDateBtnText: {
    color: colors.surface,
  },
  effectiveDateNote: {
    fontSize: 11,
    color: colors.text2,
    marginTop: 6,
    textAlign: "center",
  },
  // 최저시급 안내 스타일
  minimumWageNote: {
    fontSize: 11,
    color: colors.text2,
    marginTop: 8,
    textAlign: "center",
  },
  minimumWageError: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 4,
    textAlign: "center",
  },
  cardLeft: {
    flex: 1,
  },
  arrowBtn: {
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  arrowButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  arrowText: {
    fontSize: 22,
    color: colors.primary,
    fontWeight: "600",
  },

  // ── 메인 탭 (직원 목록 | 초대 코드)
  mainTabs: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mainTab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  mainTabActive: {
    borderBottomColor: colors.primary,
  },
  mainTabText: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.text2,
  },
  mainTabTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },

  // ── 초대 코드 탭 내용
  inviteSection: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
  },
  inviteWorkplaceName: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  inviteSubtitle: {
    fontSize: 14,
    color: colors.text2,
    lineHeight: 20,
    marginBottom: 28,
  },
  codeCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  codeLabel: {
    fontSize: 13,
    color: colors.text2,
    marginBottom: 16,
    fontWeight: "500",
  },
  codeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  codeBox: {
    width: 44,
    height: 52,
    borderRadius: 10,
    backgroundColor: colors.primaryDim,
    borderWidth: 1.5,
    borderColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  codeChar: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.primary,
  },
  expiryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  expiryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  expiryText: {
    fontSize: 13,
    color: colors.text2,
  },
  shareBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    ...shadows.button,
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  regenBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  regenBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  noticeBox: {
    backgroundColor: colors.surface2,
    borderRadius: 12,
    padding: 16,
  },
  noticeText: {
    fontSize: 13,
    color: colors.text2,
    lineHeight: 22,
  },
});
