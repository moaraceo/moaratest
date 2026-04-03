import { router } from "expo-router";
import React from "react";
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { colors, shadows } from "../constants/theme";

export default function RoleSelectScreen() {
  const handleRoleSelect = (role: "owner" | "employee") => {
    // TODO: Implement role selection logic
    console.log("Selected role:", role);

    // Navigate to appropriate dashboard based on role
    if (role === "owner") {
      router.push("/owner-dashboard");
    } else if (role === "employee") {
      router.push("/staff-main");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>어떤 역할로 사용하시나요?</Text>

        <TouchableOpacity
          style={styles.roleCard}
          onPress={() => handleRoleSelect("owner")}
        >
          <View style={styles.cardContent}>
            <Text style={styles.icon}>🏪</Text>
            <View style={styles.textContainer}>
              <Text style={styles.roleTitle}>사장님</Text>
              <Text style={styles.roleDescription}>사업장을 관리해요</Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.roleCard}
          onPress={() => handleRoleSelect("employee")}
        >
          <View style={styles.cardContent}>
            <Text style={styles.icon}>👤</Text>
            <View style={styles.textContainer}>
              <Text style={styles.roleTitle}>직원</Text>
              <Text style={styles.roleDescription}>출퇴근을 기록해요</Text>
            </View>
          </View>
        </TouchableOpacity>
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
