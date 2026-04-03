import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function WorkHistoryScreen() {
  const router = useRouter();
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(3);
  const [showModal, setShowModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [requestType, setRequestType] = useState<
    "clockIn" | "clockOut" | "hours"
  >("clockOut");

  const [requestedTime, setRequestedTime] = useState("");
  const [requestReason, setRequestReason] = useState("");

  const prevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleModificationRequest = (record: any) => {
    setSelectedRecord(record);
    setShowModal(true);
    setRequestedTime("");
    setRequestReason("");
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedRecord(null);
    setRequestedTime("");
    setRequestReason("");
  };

  const handleSubmitRequest = () => {
    if (!selectedRecord || !requestedTime || !requestReason) {
      return;
    }

    // Here we would update the record with the modification request
    // For now, just show a success message and close the modal
    console.log("Modification request submitted:", {
      recordId: selectedRecord.id,
      requestType,
      requestedTime,
      reason: requestReason,
    });

    handleCloseModal();
    alert("수정 요청을 보냈어요 ✓");
  };

  const workHistory = [
    {
      id: 1,
      date: "3/14 목",
      checkIn: "09:02",
      checkOut: "18:05",
      hours: "9h 3m",
      status: "CONFIRMED",
    },
    {
      id: 2,
      date: "3/13 수",
      checkIn: "08:58",
      checkOut: "17:45",
      hours: "8h 47m",
      status: "PENDING",
    },
    {
      id: 3,
      date: "3/12 화",
      checkIn: "09:15",
      checkOut: "18:30",
      hours: "9h 15m",
      status: "REJECTED",
    },
    {
      id: 4,
      date: "3/11 월",
      checkIn: "09:00",
      checkOut: "18:00",
      hours: "9h 0m",
      status: "PENDING",
    },
    {
      id: 5,
      date: "3/8 금",
      checkIn: "08:45",
      checkOut: "17:30",
      hours: "8h 45m",
      status: "CONFIRMED",
    },
    {
      id: 6,
      date: "3/7 목",
      checkIn: "09:10",
      checkOut: "18:15",
      hours: "9h 5m",
      status: "PENDING",
    },
    {
      id: 7,
      date: "3/6 수",
      checkIn: "08:55",
      checkOut: "17:50",
      hours: "8h 55m",
      status: "CONFIRMED",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "#34C97A";
      case "PENDING":
        return "#FFB547";
      case "REJECTED":
        return "#FF5C5C";
      default:
        return "#8B92AA";
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "rgba(52, 201, 122, 0.2)";
      case "PENDING":
        return "rgba(255, 181, 71, 0.2)";
      case "REJECTED":
        return "rgba(255, 92, 92, 0.2)";
      default:
        return "rgba(139, 146, 170, 0.2)";
    }
  };

  const formatMonth = (dateObj: Date) => {
    return `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월`;
  };

  const goBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>근무 이력</Text>
        <View style={styles.monthNavigation}>
          <TouchableOpacity style={styles.monthButton} onPress={prevMonth}>
            <Text style={styles.monthArrow}>{"<"}</Text>
          </TouchableOpacity>
          <Text style={styles.monthText}>
            {formatMonth(new Date(year, month - 1))}
          </Text>
          <TouchableOpacity style={styles.monthButton} onPress={nextMonth}>
            <Text style={styles.monthArrow}>{">"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Monthly Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>이번달 요약</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>총 근무시간</Text>
              <Text style={styles.summaryValue}>80h</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>예상 급여</Text>
              <Text style={styles.summaryValue}>924,000원</Text>
              <Text style={styles.summarySubtext}>(세전)</Text>
            </View>
          </View>
        </View>

        {/* Work History List */}
        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>근무 기록</Text>
          {workHistory.map((item, index) => (
            <View key={item.id}>
              <View style={styles.historyItem}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyDate}>{item.date}</Text>
                  <Text style={styles.historyTime}>
                    {item.checkIn} ~ {item.checkOut}
                  </Text>
                  <Text style={styles.historyHours}>{item.hours}</Text>
                </View>
                {item.status === "CONFIRMED" ? (
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusBgColor(item.status) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(item.status) },
                      ]}
                    >
                      확정
                    </Text>
                  </View>
                ) : item.status === "PENDING" ? (
                  <TouchableOpacity
                    style={styles.requestButton}
                    onPress={() => handleModificationRequest(item)}
                  >
                    <Text style={styles.requestButtonText}>수정 요청 &gt;</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.reRequestButton}
                    onPress={() => handleModificationRequest(item)}
                  >
                    <Text style={styles.reRequestButtonText}>재요청 &gt;</Text>
                  </TouchableOpacity>
                )}
              </View>
              {index < workHistory.length - 1 && (
                <View style={styles.divider} />
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Modification Request Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <Text style={styles.modalTitle}>수정 요청</Text>
            <View style={styles.modalDivider} />

            {/* Current Record */}
            {selectedRecord && (
              <View style={styles.currentRecord}>
                <Text style={styles.recordDate}>
                  날짜: {selectedRecord.date}
                </Text>
                <Text style={styles.recordTime}>
                  출근: {selectedRecord.checkIn}
                </Text>
                <Text style={styles.recordTime}>
                  퇴근: {selectedRecord.checkOut}
                </Text>
              </View>
            )}

            {/* Request Type Selection */}
            <View style={styles.requestTypeSection}>
              <TouchableOpacity
                style={[
                  styles.requestTypeOption,
                  requestType === "clockOut" && styles.requestTypeActive,
                ]}
                onPress={() => setRequestType("clockOut")}
              >
                <Text style={styles.requestTypeText}>퇴근 시각 수정</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.requestTypeOption,
                  requestType === "clockIn" && styles.requestTypeActive,
                ]}
                onPress={() => setRequestType("clockIn")}
              >
                <Text style={styles.requestTypeText}>출근 시각 수정</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.requestTypeOption,
                  requestType === "hours" && styles.requestTypeActive,
                ]}
                onPress={() => setRequestType("hours")}
              >
                <Text style={styles.requestTypeText}>근무시간 오류</Text>
              </TouchableOpacity>
            </View>

            {/* Request Time Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>수정 요청 시각</Text>
              <TextInput
                style={styles.timeInput}
                value={requestedTime}
                onChangeText={setRequestedTime}
                placeholder="HH:MM"
                placeholderTextColor="#8B92AA"
              />
            </View>

            {/* Reason Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>사유</Text>
              <TextInput
                style={styles.reasonInput}
                value={requestReason}
                onChangeText={setRequestReason}
                placeholder="수정이 필요한 사유를 입력하세요"
                placeholderTextColor="#8B92AA"
                multiline={true}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCloseModal}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmitRequest}
              >
                <Text style={styles.submitButtonText}>요청 보내기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push("/staff-main")}
        >
          <Text style={styles.tabIcon}>🏠</Text>
          <Text style={styles.tabText}>홈</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Text style={styles.tabIconActive}>📅</Text>
          <Text style={styles.tabTextActive}>근무이력</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push("/payslip")}
        >
          <Text style={styles.tabIcon}>💰</Text>
          <Text style={styles.tabText}>명세서</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push("/profile")}
        >
          <Text style={styles.tabIcon}>👤</Text>
          <Text style={styles.tabText}>내정보</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F1117",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1A1D27",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  backArrow: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  headerDate: {
    fontSize: 13,
    color: "#8B92AA",
  },
  monthNavigation: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  monthButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#242736",
    borderWidth: 1,
    borderColor: "#2E3347",
    justifyContent: "center",
    alignItems: "center",
  },
  monthArrow: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  monthText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "monospace",
    minWidth: 80,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  summaryCard: {
    backgroundColor: "#242736",
    borderWidth: 1,
    borderColor: "#2E3347",
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#2E3347",
    marginHorizontal: 20,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#8B92AA",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  summarySubtext: {
    fontSize: 10,
    color: "#8B92AA",
  },
  historyCard: {
    backgroundColor: "#242736",
    borderWidth: 1,
    borderColor: "#2E3347",
    borderRadius: 16,
    padding: 20,
    marginBottom: 80, // Space for tab bar
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  historyLeft: {
    flex: 1,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  historyTime: {
    fontSize: 12,
    color: "#8B92AA",
    marginBottom: 2,
  },
  historyHours: {
    fontSize: 12,
    color: "#4A9EFF",
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#2E3347",
    marginVertical: 8,
  },
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1A1D27",
    borderTopWidth: 1,
    borderTopColor: "#2E3347",
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  tabIconActive: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabTextActive: {
    fontSize: 10,
    color: "#4A9EFF",
    fontWeight: "500",
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
    opacity: 0.6,
  },
  tabText: {
    fontSize: 10,
    color: "#555D75",
    fontWeight: "500",
  },
  requestButton: {
    backgroundColor: "#FFB547",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  requestButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  reRequestButton: {
    backgroundColor: "#FF5C5C",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reRequestButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1A1D27",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 16,
  },
  modalDivider: {
    height: 1,
    backgroundColor: "#2E3347",
    marginVertical: 16,
  },
  currentRecord: {
    backgroundColor: "#242736",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  recordDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  recordTime: {
    fontSize: 13,
    color: "#8B92AA",
    marginBottom: 4,
  },
  requestTypeSection: {
    marginBottom: 20,
  },
  requestTypeOption: {
    backgroundColor: "#242736",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  requestTypeActive: {
    backgroundColor: "#4A9EFF",
  },
  requestTypeText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  timeInput: {
    backgroundColor: "#242736",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#FFFFFF",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#2E3347",
  },
  reasonInput: {
    backgroundColor: "#242736",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#FFFFFF",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#2E3347",
    height: 80,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#242736",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8B92AA",
  },
  submitButton: {
    flex: 1,
    backgroundColor: "#4A9EFF",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
