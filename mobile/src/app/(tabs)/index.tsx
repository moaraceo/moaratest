import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
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
import { supabase } from "../../lib/supabase";
import { borderRadius, colors, shadows, spacing } from "../../constants/theme";
import { useAuth, type AuthUser } from "../store/authStore";

WebBrowser.maybeCompleteAuthSession();

const API_URL = process.env["EXPO_PUBLIC_API_URL"] ?? "";

type Role = "owner" | "staff";

export default function HomeScreen() {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role>("owner");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const redirectUrl = "moara-test://";
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
      });

      if (error || !data.url) {
        Alert.alert("오류", "구글 로그인을 시작할 수 없습니다.\nSupabase 대시보드에서 Google 프로바이더를 설정해주세요.");
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type !== "success") return;

      // PKCE: code 교환
      const url = result.url;
      const codeMatch = url.match(/[?&]code=([^&]+)/);
      if (codeMatch?.[1]) {
        const { data: sessionData } = await supabase.auth.exchangeCodeForSession(codeMatch[1]);
        if (sessionData.session) {
          const res = await fetch(`${API_URL}/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken: sessionData.session.access_token }),
          }).catch(() => null);
          if (res?.ok) {
            const body = await res.json() as {
              ok: boolean;
              data?: { user: AuthUser; tokens: { accessToken: string; refreshToken: string } };
            };
            if (body.ok && body.data) {
              await login(body.data.user, body.data.tokens);
            }
          }
        }
        return;
      }

      // Implicit: fragment 파싱
      const fragment = url.split("#")[1] ?? "";
      const params = Object.fromEntries(fragment.split("&").map((p) => p.split("=").map(decodeURIComponent)));
      if (params["access_token"] && params["refresh_token"]) {
        const { data: sessionData } = await supabase.auth.setSession({
          access_token: params["access_token"],
          refresh_token: params["refresh_token"],
        });
        if (sessionData.session) {
          const res = await fetch(`${API_URL}/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken: sessionData.session.access_token }),
          }).catch(() => null);
          if (res?.ok) {
            const body = await res.json() as {
              ok: boolean;
              data?: { user: AuthUser; tokens: { accessToken: string; refreshToken: string } };
            };
            if (body.ok && body.data) {
              await login(body.data.user, body.data.tokens);
            }
          }
        }
      }
    } catch {
      Alert.alert("오류", "구글 로그인 중 오류가 발생했습니다.");
    } finally {
      setGoogleLoading(false);
    }
  };

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

    const body = await res.json() as {
      ok: boolean;
      error?: { message: string };
      data?: { message: string; devCode?: string };
    };
    if (!res.ok || !body.ok) {
      Alert.alert("오류", body.error?.message ?? "발송 실패");
      return;
    }

    router.push({
      pathname: "/verify",
      params: {
        phoneNumber: trimmed,
        devCode: body.data?.devCode ?? "",
        role: selectedRole,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.content}>
          {/* 로고 */}
          <View style={styles.logoSection}>
            <Image
              source={require("../../../assets/images/logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.logoSubtitle}>소상공인 급여 관리</Text>
          </View>

          {/* Floating card */}
          <View style={styles.card}>
            {/* 사장님 / 직원 탭 */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, selectedRole === "owner" && styles.tabActive]}
                onPress={() => setSelectedRole("owner")}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, selectedRole === "owner" && styles.tabTextActive]}>
                  ⚙ 사장님
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, selectedRole === "staff" && styles.tabActive]}
                onPress={() => setSelectedRole("staff")}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, selectedRole === "staff" && styles.tabTextActive]}>
                  👤 직원
                </Text>
              </TouchableOpacity>
            </View>

            {/* Google 로그인 */}
            <TouchableOpacity
              style={[styles.googleButton, googleLoading && { opacity: 0.6 }]}
              onPress={handleGoogleLogin}
              disabled={googleLoading}
            >
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleButtonText}>
                {googleLoading ? "로그인 중..." : "Google로 로그인"}
              </Text>
            </TouchableOpacity>

            {/* 구분선 */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>또는 SMS로 로그인</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* 전화번호 로그인 섹션 */}
            <Text style={styles.smsTitle}>전화번호로 로그인</Text>
            <Text style={styles.smsHint}>등록된 전화번호로 인증번호를 보내드려요</Text>

            {/* 전화번호 입력 */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>📱</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="010-0000-0000"
                placeholderTextColor={colors.text3}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                maxLength={11}
              />
            </View>

            {/* 인증번호 받기 */}
            <TouchableOpacity
              style={[styles.button, loading && { opacity: 0.6 }]}
              onPress={handleGetVerificationCode}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "발송 중..." : "인증번호 받기"}
              </Text>
            </TouchableOpacity>
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

  // 로고 섹션
  logoSection: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  logoImage: {
    width: 120,
    height: 48,
    resizeMode: "contain",
    marginBottom: spacing.xs,
  },
  logoSubtitle: {
    fontSize: 13,
    color: colors.text2,
    fontWeight: "500",
  },

  // 카드
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    ...shadows.card,
  },

  // 탭
  tabContainer: {
    flexDirection: "row",
    backgroundColor: colors.bg,
    borderRadius: borderRadius.lg,
    padding: 4,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: colors.primary,
    ...shadows.button,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text2,
  },
  tabTextActive: {
    color: "#FFFFFF",
  },

  // Google 버튼
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    gap: 8,
  },
  googleIcon: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4285F4",
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },

  // 구분선
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 12,
    color: colors.text3,
    fontWeight: "500",
  },

  // SMS 섹션
  smsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  smsHint: {
    fontSize: 12,
    color: colors.text3,
    marginBottom: spacing.md,
  },

  // 입력창
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
  },

  // 인증번호 버튼
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    ...shadows.button,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
