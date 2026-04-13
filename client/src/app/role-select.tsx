import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "./store/authStore";

const API_URL = process.env["EXPO_PUBLIC_API_URL"] ?? "";
import { colors, shadows } from "../constants/theme";

export default function RoleSelectScreen() {
  const { user, accessToken, setRole } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = async (role: "owner" | "staff") => {
    if (!user) {
      Alert.alert("오류", "로그인 세션이 만료됐어요. 다시 인증해주세요.");
      router.replace("/(tabs)");
      return;
    }

    setLoading(true);
    const res = await fetch(`${API_URL}/auth/role`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ role }),
    }).catch(() => null);
    setLoading(false);

    if (!res?.ok) {
      Alert.alert("오류", "역할 설정에 실패했습니다. 다시 시도해주세요.");
      return;
    }

    setRole(role);

    if (role === "owner") {
      router.replace("/register-workplace");
    } else {
      router.replace("/join-workplace");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>어떤 역할로 사용하시나요?</Text>

        <TouchableOpacity
          style={styles.roleCard}
          onPress={() => handleRoleSelect("owner")}
          disabled={loading}
        >
          <View style={styles.cardContent}>
            <Text style={styles.icon}>🏪</Text>
            <View style={styles.textContainer}>
              <Text style={styles.roleTitle}>사장님</Text>
              <Text style={styles.roleDescription}>사업장을 등록하고 직원을 관리해요</Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.roleCard}
          onPress={() => handleRoleSelect("staff")}
          disabled={loading}
        >
          <View style={styles.cardContent}>
            <Text style={styles.icon}>👤</Text>
            <View style={styles.textContainer}>
              <Text style={styles.roleTitle}>직원</Text>
              <Text style={styles.roleDescription}>사장님께 받은 초대코드로 참여해요</Text>
            </View>
          </View>
        </TouchableOpacity>

        {loading && (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginTop: 24 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
    marginBottom: 60,
  },
  roleCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    ...shadows.card,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    fontSize: 32,
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    color: colors.text2,
  },
});
