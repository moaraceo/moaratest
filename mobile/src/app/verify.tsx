import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, shadows } from "../constants/theme";
import { useAuth, type AuthUser } from "./store/authStore";

type Role = "owner" | "staff";

const API_URL = process.env["EXPO_PUBLIC_API_URL"] ?? "";

const TERMS = [
  { key: "service", label: "서비스 이용약관 동의", required: true },
  { key: "privacy", label: "개인정보 수집·이용에 동의", required: true },
  { key: "location", label: "위치기반 서비스 이용약관 동의", required: true },
] as const;

export default function VerifyScreen() {
  const { phoneNumber, devCode, role } = useLocalSearchParams<{ phoneNumber: string; devCode?: string; role?: string }>();
  const selectedRole: Role = role === "staff" ? "staff" : "owner";
  const { login, setRole } = useAuth();
  const tokenRef = useRef<string | null>(null);
  const [verificationCode, setVerificationCode] = useState(["", "", "", "", "", ""]);
  const [timeLeft, setTimeLeft] = useState(300);
  const [verifying, setVerifying] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const [showTermsModal, setShowTermsModal] = useState(false);
  const [agreed, setAgreed] = useState([false, false, false]);
  const allAgreed = agreed.every(Boolean);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const timerColor = timeLeft === 0 ? "#EF4444" : timeLeft < 60 ? "#EF4444" : colors.primary;

  const handleResend = async () => {
    const res = await fetch(`${API_URL}/auth/sms/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phoneNumber }),
    }).catch(() => null);
    if (!res?.ok) {
      Alert.alert("재발송 실패", "잠시 후 다시 시도해주세요.");
      return;
    }
    setTimeLeft(300);
    setVerificationCode(["", "", "", "", "", ""]);
    inputRefs.current[0]?.focus();
  };

  const handleInputChange = (value: string, index: number) => {
    if (value && !/^\d$/.test(value)) return;
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = verificationCode.join("");
    if (code.length !== 6) return;

    setVerifying(true);

    const res = await fetch(`${API_URL}/auth/sms/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phoneNumber, code }),
    }).catch(() => null);

    setVerifying(false);

    if (!res) {
      Alert.alert("인증 실패", "서버에 연결할 수 없습니다.");
      return;
    }

    const body = await res.json() as {
      ok: boolean;
      error?: { message: string };
      data?: {
        user: AuthUser;
        tokens: { accessToken: string; refreshToken: string };
      };
    };

    if (!res.ok || !body.ok || !body.data) {
      Alert.alert("인증 실패", body.error?.message ?? "인증에 실패했습니다.");
      return;
    }

    const { user, tokens } = body.data;
    await login(user, tokens);
    tokenRef.current = tokens.accessToken;

    const isNewUser = !user.name || user.name === user.phone;
    if (isNewUser) {
      setShowTermsModal(true);
    }
    // 기존 사용자: _layout.tsx의 AppNavigator가 role에 따라 자동 라우팅
  };

  const handleToggleAll = () => {
    setAgreed(allAgreed ? [false, false, false] : [true, true, true]);
  };

  const handleToggleItem = (index: number) => {
    const next = [...agreed];
    next[index] = !next[index];
    setAgreed(next);
  };

  const handleTermsConfirm = async () => {
    setShowTermsModal(false);
    const token = tokenRef.current;

    if (selectedRole === "owner") {
      // 사장님: role 설정 후 사업장 등록 화면으로
      if (token) {
        const res = await fetch(`${API_URL}/auth/role`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ role: "owner" }),
        }).catch(() => null);
        if (res?.ok) setRole("owner");
      }
      router.replace("/register-workplace");
    } else {
      // 직원: 기본 정보 입력 화면으로
      router.replace({ pathname: "/register", params: { phoneNumber, role: "staff" } });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.content}>
          <Text style={styles.title}>인증번호를 입력해주세요</Text>
          <Text style={styles.phoneNumberText}>{phoneNumber} 로 발송됐어요</Text>

          {devCode ? (
            <View style={styles.devBanner}>
              <Text style={styles.devBannerLabel}>개발용 인증번호</Text>
              <Text style={styles.devBannerCode}>{devCode}</Text>
            </View>
          ) : null}

          <View style={styles.timerContainer}>
            <Text style={[styles.timerText, { color: timerColor }]}>
              {timeLeft === 0 ? "시간 초과" : formatTime(timeLeft)}
            </Text>
            <TouchableOpacity style={styles.resendButton} onPress={handleResend}>
              <Text style={styles.resendText}>재발송</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            {verificationCode.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                style={styles.codeInput}
                value={digit}
                onChangeText={(value) => handleInputChange(value, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="numeric"
                maxLength={1}
                textAlign="center"
                selectTextOnFocus
              />
            ))}
          </View>

          <View style={styles.guideContainer}>
            <Text style={styles.guideText}>· 인증번호는 발송 후 5분간 유효해요</Text>
            <Text style={styles.guideText}>· 문자가 오지 않으면 재발송을 눌러주세요</Text>
            <Text style={styles.guideText}>· 카카오톡 알림으로 발송될 수 있어요</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, verifying && { opacity: 0.6 }]}
            onPress={handleVerify}
            disabled={verifying || verificationCode.join("").length !== 6}
          >
            <Text style={styles.buttonText}>{verifying ? "확인 중..." : "확인"}</Text>
          </TouchableOpacity>

          <View style={styles.divider} />
          <View style={styles.linksContainer}>
            <TouchableOpacity style={styles.linkButton} onPress={() => router.push("/find-phone")}>
              <Text style={styles.linkText}>휴대폰 번호 찾기</Text>
            </TouchableOpacity>
            <Text style={styles.linkSeparator}>|</Text>
            <TouchableOpacity style={styles.linkButton} onPress={() => router.push("/email-login")}>
              <Text style={styles.linkText}>이메일 로그인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* 약관 동의 팝업 */}
      <Modal
        visible={showTermsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetTitle}>서비스 이용에 동의해주세요</Text>
            <Text style={styles.sheetSubtitle}>
              모아라 서비스 이용을 위해 아래 약관에 동의해 주세요.
            </Text>

            <TouchableOpacity style={styles.allAgreeRow} onPress={handleToggleAll}>
              <View style={[styles.checkbox, allAgreed && styles.checkboxActive]}>
                {allAgreed && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={styles.allAgreeLabel}>전체 동의</Text>
            </TouchableOpacity>

            <View style={styles.termsDivider} />

            <ScrollView style={styles.termsList} showsVerticalScrollIndicator={false}>
              {TERMS.map((term, index) => (
                <View key={term.key} style={styles.termRow}>
                  <TouchableOpacity
                    style={styles.termLeft}
                    onPress={() => handleToggleItem(index)}
                  >
                    <View style={[styles.checkboxSm, agreed[index] && styles.checkboxActive]}>
                      {agreed[index] && <Text style={styles.checkMarkSm}>✓</Text>}
                    </View>
                    <View>
                      <Text style={styles.termLabel}>
                        <Text style={styles.required}>(필수) </Text>
                        {term.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => console.log(`${term.key} 약관 보기`)}>
                    <Text style={styles.viewLink}>보기</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.confirmBtn, !allAgreed && styles.confirmBtnDisabled]}
              onPress={handleTermsConfirm}
              disabled={!allAgreed}
            >
              <Text style={[styles.confirmBtnText, !allAgreed && styles.confirmBtnTextDisabled]}>
                동의 완료
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  keyboardAvoidingView: { flex: 1 },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  title: {
    fontSize: 24, fontWeight: "600", color: colors.text,
    textAlign: "center", marginBottom: 60,
  },
  inputContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 40 },
  codeInput: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, width: 50, height: 60, fontSize: 24,
    fontWeight: "600", color: colors.text, textAlign: "center",
  },
  button: {
    backgroundColor: colors.primary, borderRadius: 12,
    paddingVertical: 16, alignItems: "center", ...shadows.button,
  },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  phoneNumberText: { fontSize: 13, color: "#6B7280", textAlign: "center", marginBottom: 40 },
  timerContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 30 },
  timerText: { fontSize: 14, fontWeight: "500", marginRight: 16 },
  resendButton: { paddingVertical: 4 },
  resendText: { fontSize: 13, color: colors.primary, textDecorationLine: "underline" },
  guideContainer: { marginBottom: 40 },
  guideText: { fontSize: 12, color: "#9CA3AF", lineHeight: 20 },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 20 },
  linksContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  linkButton: { paddingVertical: 8 },
  linkText: { fontSize: 13, color: "#6B7280" },
  linkSeparator: { fontSize: 13, color: "#D1D5DB", marginHorizontal: 12 },

  modalOverlay: {
    flex: 1, justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingBottom: 36, paddingTop: 12,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: "center", marginBottom: 20,
  },
  sheetTitle: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: 6 },
  sheetSubtitle: { fontSize: 13, color: colors.text2, marginBottom: 24, lineHeight: 18 },
  allAgreeRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, gap: 12,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: colors.border,
    justifyContent: "center", alignItems: "center",
  },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkMark: { fontSize: 13, fontWeight: "700", color: "#fff" },
  allAgreeLabel: { fontSize: 16, fontWeight: "600", color: colors.text },
  termsDivider: { height: 1, backgroundColor: colors.border, marginBottom: 8 },
  termsList: { maxHeight: 180 },
  termRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingVertical: 12,
  },
  termLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  checkboxSm: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.border,
    justifyContent: "center", alignItems: "center",
  },
  checkMarkSm: { fontSize: 11, fontWeight: "700", color: "#fff" },
  termLabel: { fontSize: 13, color: colors.text, flexShrink: 1 },
  required: { fontSize: 13, color: colors.primary, fontWeight: "600" },
  viewLink: { fontSize: 12, color: colors.text2, textDecorationLine: "underline", paddingLeft: 8 },
  confirmBtn: {
    marginTop: 20, height: 54, borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: "center", alignItems: "center",
    ...shadows.button,
  },
  confirmBtnDisabled: { backgroundColor: colors.border, shadowOpacity: 0, elevation: 0 },
  confirmBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  confirmBtnTextDisabled: { color: colors.text3 },

  devBanner: {
    backgroundColor: "#FEF9C3",
    borderWidth: 1,
    borderColor: "#FDE047",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 24,
    alignItems: "center",
  },
  devBannerLabel: { fontSize: 11, color: "#92400E", marginBottom: 2 },
  devBannerCode: { fontSize: 22, fontWeight: "700", color: "#92400E", letterSpacing: 4 },
});
