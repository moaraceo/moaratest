import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, shadows } from "../constants/theme";
import { useAuth } from "./store/authStore";
import { useStaff } from "./store/staffStore";
import { useWorkplace } from "./store/workplaceStore";

export default function JoinWorkplaceScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isAdditional = mode === "add";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const { user } = useAuth();
  const { joinByInviteCode, setCurrentWorkplace } = useWorkplace();
  const { staffList, addStaffToWorkplace } = useStaff();

  // 현재 로그인한 직원 (ID 또는 이름으로 매핑)
  const currentStaff =
    staffList.find((s) => s.id === user?.id) ?? staffList[0];

  const handleSubmit = async () => {
    setError("");
    if (code.trim().length !== 6) {
      setError("6자리 코드를 모두 입력해주세요.");
      return;
    }

    const result = joinByInviteCode(code);
    if (!result.success) {
      setError(result.error ?? "오류가 발생했어요.");
      return;
    }

    if (result.workplace) {
      // 직원의 workplaceIds에 추가
      if (currentStaff) {
        addStaffToWorkplace(currentStaff.id, result.workplace.id);
      }
      // 현재 사업장 설정 + 저장
      setCurrentWorkplace(result.workplace.id);
      await AsyncStorage.setItem("@moara:workplaceId", result.workplace.id);
      setSuccess(result.workplace.name);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>참여 완료!</Text>
          <Text style={styles.successSubtitle}>
            <Text style={styles.successHighlight}>{success}</Text>에{"\n"}
            성공적으로 참여했어요.
          </Text>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() => isAdditional ? router.back() : router.replace("/staff-main")}
          >
            <Text style={styles.confirmButtonText}>확인</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isAdditional ? "사업장 추가" : "사업장 참여"}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* 안내 카드 */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>🏪</Text>
          <Text style={styles.infoTitle}>초대 코드를 입력해주세요</Text>
          <Text style={styles.infoDesc}>
            사장님께 받은 6자리 코드를 입력하면{"\n"}
            사업장에 바로 참여할 수 있어요.{"\n"}
            코드는 발급 후 24시간 동안 유효해요.
          </Text>
        </View>

        {/* 코드 입력 */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>초대 코드</Text>

          {/* 6칸 박스 + 숨긴 TextInput 오버레이 */}
          <View style={styles.codeBoxContainer}>
            <View style={styles.codeBoxRow}>
              {Array.from({ length: 6 }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.codeBox,
                    code[i] ? styles.codeBoxFilled : null,
                    i === code.length && styles.codeBoxCursor,
                  ]}
                >
                  <Text style={styles.codeBoxChar}>{code[i] ?? ""}</Text>
                </View>
              ))}
            </View>
            {/* TextInput이 박스 위를 덮어 탭 이벤트 수신 */}
            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              value={code}
              onChangeText={(t) => {
                setError("");
                setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
              }}
              autoCapitalize="characters"
              maxLength={6}
              keyboardType="default"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              autoFocus
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        {/* 참여 버튼 */}
        <TouchableOpacity
          style={[styles.submitButton, code.length !== 6 && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={code.length !== 6}
        >
          <Text style={styles.submitButtonText}>사업장 참여하기</Text>
        </TouchableOpacity>

        {/* 안내 문구 */}
        <Text style={styles.helpText}>
          코드가 없으시면 사장님께 초대 코드 발급을 요청해주세요.
        </Text>
      </View>
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
    justifyContent: "center",
    alignItems: "center",
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  infoCard: {
    backgroundColor: colors.primaryDim,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 32,
    ...shadows.card,
  },
  infoIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 10,
  },
  infoDesc: {
    fontSize: 13,
    color: colors.text2,
    textAlign: "center",
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: 28,
  },
  inputLabel: {
    fontSize: 13,
    color: colors.text2,
    marginBottom: 12,
    fontWeight: "500",
  },
  codeBoxContainer: {
    alignItems: "center",
    marginBottom: 12,
    position: "relative",
  },
  codeBoxRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
  },
  codeBox: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  codeBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryDim,
  },
  codeBoxCursor: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  codeBoxChar: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.primary,
  },
  hiddenInput: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0,
    fontSize: 1,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    textAlign: "center",
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.surface,
  },
  helpText: {
    fontSize: 12,
    color: colors.text3,
    textAlign: "center",
    lineHeight: 18,
  },
  // 성공 화면
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  successIcon: {
    fontSize: 64,
    color: colors.success,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 16,
    color: colors.text2,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
  },
  successHighlight: {
    color: colors.primary,
    fontWeight: "600",
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 60,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.surface,
  },
});
