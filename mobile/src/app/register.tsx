import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "./store/authStore";
import { colors, shadows, borderRadius, spacing } from "../constants/theme";

const API_URL = process.env["EXPO_PUBLIC_API_URL"] ?? "";

export default function RegisterScreen() {
  const { phoneNumber, role } = useLocalSearchParams<{ phoneNumber: string; role?: string }>();
  const { user, accessToken, updateUser, setRole } = useAuth();

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [connectCode, setConnectCode] = useState("");
  const [nameError, setNameError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("이름을 입력해주세요");
      return;
    }
    if (trimmedName.length < 2) {
      setNameError("이름은 2자 이상 입력해주세요");
      return;
    }

    if (!user) {
      Alert.alert("오류", "로그인 세션이 만료됐어요. 다시 인증해주세요.");
      router.replace("/(tabs)");
      return;
    }

    setLoading(true);

    // 이름 저장
    const profileRes = await fetch(`${API_URL}/auth/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: trimmedName,
        ...(birthDate.trim() ? { birthDate: birthDate.trim() } : {}),
      }),
    }).catch(() => null);

    // role 설정 (직원)
    const roleRes = await fetch(`${API_URL}/auth/role`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ role: "staff" }),
    }).catch(() => null);

    setLoading(false);

    if (!profileRes?.ok) {
      Alert.alert("오류", "정보 저장에 실패했습니다. 다시 시도해주세요.");
      return;
    }

    updateUser({ name: trimmedName });
    if (roleRes?.ok) setRole("staff");

    router.replace("/staff-main");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 헤더 */}
          <View style={styles.headerSection}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>👤</Text>
            </View>
            <Text style={styles.title}>기본 정보 입력</Text>
            <Text style={styles.subtitle}>
              처음 로그인하셨군요!{"\n"}기본 정보를 등록해 주세요.
            </Text>
          </View>

          {/* 이름 (필수) */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>이름</Text>
              <Text style={styles.required}> *</Text>
            </View>
            <TextInput
              style={[styles.input, nameError ? styles.inputError : null]}
              placeholder="홍길동"
              placeholderTextColor={colors.text3}
              value={name}
              onChangeText={(v) => { setName(v); setNameError(""); }}
              autoCorrect={false}
              autoFocus
            />
            {nameError ? (
              <Text style={styles.errorText}>{nameError}</Text>
            ) : null}
          </View>

          {/* 생년월일 (선택) */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>생년월일</Text>
              <Text style={styles.optional}> (선택)</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.text3}
              value={birthDate}
              onChangeText={setBirthDate}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
          </View>

          {/* 사업장 연결 코드 (선택) */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>사업장 연결 코드</Text>
              <Text style={styles.optional}> (선택)</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="010-0000-0000"
              placeholderTextColor={colors.text3}
              value={connectCode}
              onChangeText={setConnectCode}
              keyboardType="phone-pad"
              maxLength={11}
            />
            <Text style={styles.fieldHint}>
              사장님 전화번호로 입력하세요. 사업장과 연결됩니다.
            </Text>
          </View>

          {/* 등록 완료 버튼 */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText}>
              {loading ? "처리 중..." : "등록 완료"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: 40,
  },

  // 헤더
  headerSection: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryDim,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text2,
    textAlign: "center",
    lineHeight: 22,
  },

  // 필드
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  required: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.danger,
  },
  optional: {
    fontSize: 13,
    color: colors.text3,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
    ...shadows.card,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 6,
  },
  fieldHint: {
    fontSize: 12,
    color: colors.text3,
    marginTop: 6,
    lineHeight: 18,
  },

  // 버튼
  submitBtn: {
    height: 54,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.sm,
    ...shadows.button,
  },
  submitBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
});
