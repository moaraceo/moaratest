import { router } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { borderRadius, colors, shadows, spacing } from "../../constants/theme";

const API_URL = process.env["EXPO_PUBLIC_API_URL"] ?? "";

export default function HomeScreen() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGetVerificationCode = async () => {
    const trimmed = phoneNumber.trim().replace(/[^0-9]/g, "");
    if (trimmed.length < 10) {
      Alert.alert("오류", "올바른 휴대폰 번호를 입력해주세요.");
      return;
    }

    setLoading(true);
    const res = await fetch(`${API_URL}/auth/sms/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: trimmed }),
    }).catch(() => null);
    setLoading(false);

    if (!res) {
      Alert.alert("오류", "서버에 연결할 수 없습니다.");
      return;
    }

    const body = await res.json() as { ok: boolean; error?: { message: string } };
    if (!res.ok || !body.ok) {
      Alert.alert("오류", body.error?.message ?? "발송 실패");
      return;
    }

    router.push({ pathname: "/verify", params: { phoneNumber: trimmed } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.content}>
          <Image
            source={require("../../../assets/images/react-logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.logoText}>소상공인 근태·급여 관리 서비스</Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.phoneInput}
              placeholder="휴대폰 번호를 입력하세요"
              placeholderTextColor="#8B92A3"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              maxLength={11}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.6 }]}
            onPress={handleGetVerificationCode}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "발송 중..." : "인증번호 받기"}
            </Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.linksContainer}>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.push("/find-phone")}
            >
              <Text style={styles.linkText}>휴대폰 번호 찾기</Text>
            </TouchableOpacity>
            <Text style={styles.linkSeparator}>|</Text>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.push("/email-login")}
            >
              <Text style={styles.linkText}>이메일 로그인</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              소상공인 근태·급여 관리 서비스
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  logoImage: {
    width: 220,
    height: 90,
    resizeMode: "contain",
    alignSelf: "center",
    marginBottom: spacing.sm,
    marginTop: spacing.xxl,
  },
  logoText: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  inputContainer: {
    width: "100%",
    marginBottom: spacing.lg,
  },
  phoneInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    ...shadows.card,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    ...shadows.button,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  footerText: {
    fontSize: 14,
    color: colors.text2,
    textAlign: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 20,
  },
  linksContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  linkButton: {
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 13,
    color: "#6B7280",
  },
  linkSeparator: {
    fontSize: 13,
    color: "#D1D5DB",
    marginHorizontal: 12,
  },
});
