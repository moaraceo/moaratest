import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "./store/authStore";

const API_URL = process.env["EXPO_PUBLIC_API_URL"] ?? "";
import { colors, shadows } from "../constants/theme";

export default function RegisterScreen() {
  const { phoneNumber } = useLocalSearchParams<{ phoneNumber: string }>();
  const { user, accessToken, updateUser } = useAuth();
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("이름을 입력해주세요");
      return;
    }
    if (trimmed.length < 2) {
      setNameError("이름은 2자 이상 입력해주세요");
      return;
    }

    if (!user) {
      Alert.alert("오류", "로그인 세션이 만료됐어요. 다시 인증해주세요.");
      router.replace("/(tabs)");
      return;
    }

    setLoading(true);
    const res = await fetch(`${API_URL}/auth/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ name: trimmed }),
    }).catch(() => null);
    setLoading(false);

    if (!res?.ok) {
      Alert.alert("오류", "이름 저장에 실패했습니다. 다시 시도해주세요.");
      return;
    }

    updateUser({ name: trimmed });
    router.replace("/role-select");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <View style={styles.content}>
          <View style={styles.headerSection}>
            <Text style={styles.title}>사용자 등록</Text>
            <Text style={styles.subtitle}>
              입력하신 이름은 근로계약서·급여명세서에 사용돼요
            </Text>
            {phoneNumber ? (
              <Text style={styles.phoneHint}>가입 번호: {phoneNumber}</Text>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>이름 (실명)</Text>
            <TextInput
              style={[styles.input, nameError ? styles.inputError : null]}
              placeholder="실명을 입력해주세요"
              placeholderTextColor={colors.text3}
              value={name}
              onChangeText={(v) => { setName(v); setNameError(""); }}
              autoCorrect={false}
              autoFocus
            />
            {nameError ? (
              <Text style={styles.errorText}>{nameError}</Text>
            ) : (
              <Text style={styles.fieldHint}>근로계약서·급여명세서에 표시되는 이름이에요</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitBtnText}>{loading ? "처리 중..." : "다음"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },

  headerSection: { marginBottom: 48 },
  title: { fontSize: 26, fontWeight: "700", color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.text2, lineHeight: 20 },
  phoneHint: { fontSize: 13, color: colors.text3, marginTop: 6 },

  fieldGroup: { marginBottom: 32 },
  label: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 8 },
  fieldHint: { fontSize: 12, color: colors.text3, marginTop: 6 },

  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
    ...shadows.card,
  },
  inputError: { borderColor: colors.danger },
  errorText: { fontSize: 12, color: colors.danger, marginTop: 6 },

  submitBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.button,
  },
  submitBtnText: { fontSize: 17, fontWeight: "700", color: "#fff" },
});
