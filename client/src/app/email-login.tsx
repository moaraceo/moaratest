import { useRouter } from "expo-router";
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
import { supabase } from "../lib/supabase";
import { colors, shadows } from "../constants/theme";

export default function EmailLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("입력 오류", "이메일과 비밀번호를 모두 입력해주세요");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      Alert.alert("로그인 실패", "이메일 또는 비밀번호를 확인해주세요");
      return;
    }
    // 로그인 성공 → _layout의 onAuthStateChange가 라우팅 처리
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>이메일 로그인</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <View style={styles.content}>
          <Text style={styles.title}>다시 만나요</Text>
          <Text style={styles.subtitle}>이메일로 로그인하세요</Text>

          {/* 이메일 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>이메일</Text>
            <TextInput
              style={styles.input}
              placeholder="example@email.com"
              placeholderTextColor={colors.text3}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* 비밀번호 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>비밀번호</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputFlex}
                placeholder="비밀번호를 입력해주세요"
                placeholderTextColor={colors.text3}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword((v) => !v)}
              >
                <Text style={styles.eyeIcon}>{showPassword ? "🙈" : "👁"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 로그인 버튼 */}
          <TouchableOpacity
            style={styles.loginBtn}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginBtnText}>
              {loading ? "로그인 중..." : "로그인"}
            </Text>
          </TouchableOpacity>

          {/* 회원가입 이동 */}
          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => router.push("/register")}
          >
            <Text style={styles.registerLinkText}>
              계정이 없으신가요? <Text style={styles.registerLinkBold}>회원가입</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },

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
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  backArrow: { fontSize: 18, color: colors.text, fontWeight: "600" },
  headerTitle: { fontSize: 20, fontWeight: "600", color: colors.text },

  content: { flex: 1, paddingHorizontal: 24, paddingTop: 48 },
  title: { fontSize: 26, fontWeight: "700", color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.text2, marginBottom: 40 },

  fieldGroup: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 8 },

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
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    ...shadows.card,
  },
  inputFlex: { flex: 1, paddingVertical: 14, fontSize: 15, color: colors.text },
  eyeBtn: { paddingLeft: 8, paddingVertical: 14 },
  eyeIcon: { fontSize: 18 },

  loginBtn: {
    marginTop: 8,
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.button,
  },
  loginBtnText: { fontSize: 17, fontWeight: "700", color: "#fff" },

  registerLink: { marginTop: 20, alignItems: "center" },
  registerLinkText: { fontSize: 14, color: colors.text2 },
  registerLinkBold: { fontWeight: "700", color: colors.primary },
});
