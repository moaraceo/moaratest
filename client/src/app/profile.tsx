import { router } from "expo-router";
import React from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, shadows } from "../constants/theme";
import StaffTabBar from "./components/common/StaffTabBar";

export default function ProfileScreen() {
  const handleEdit = () => {
    Alert.alert("편집", "프로필 편집 기능은 준비 중입니다.");
  };

  const handleLogout = () => {
    Alert.alert("로그아웃", "로그아웃하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        onPress: () => {
          router.push("/");
        },
      },
    ]);
  };

  const handleAddWorkplace = () => {
    Alert.alert("사업장 추가", "다른 사업장 추가 기능은 준비 중입니다.");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <Text style={styles.headerTitle}>내 정보</Text>
        <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
          <Text style={styles.editButtonText}>편집</Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>김</Text>
          </View>
          <Text style={styles.profileName}>김민지</Text>
          <Text style={styles.profileWorkplace}>카페 A 매장</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>직원</Text>
          </View>
        </View>

        {/* Work Info Card */}
        <View style={styles.workInfoCard}>
          <Text style={styles.sectionTitle}>내 근무 정보</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>시급</Text>
            <Text style={styles.infoValue}>10,030원</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>입사일</Text>
            <Text style={styles.infoValue}>2024.01.15</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>근무 형태</Text>
            <Text style={styles.infoValue}>파트타임</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>소정근로시간</Text>
            <Text style={styles.infoValue}>주 15시간</Text>
          </View>
        </View>

        {/* Monthly Status Card */}
        <View style={styles.monthlyStatusCard}>
          <Text style={styles.sectionTitle}>이번달 현황</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>누적 근무시간</Text>
            <Text style={styles.infoValue}>80h 00m</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>예상 급여 (세전)</Text>
            <Text style={styles.infoValue}>924,000원</Text>
          </View>
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>주휴수당 충족</Text>
            <Text style={styles.weeklyAllowanceStatus}>✓ 충족</Text>
          </View>
        </View>

        {/* Workplace Card */}
        <View style={styles.workplaceCard}>
          <TouchableOpacity style={styles.workplaceItem}>
            <View style={styles.workplaceInfo}>
              <Text style={styles.workplaceName}>카페 A 매장</Text>
              <Text style={styles.workplaceAddress}>서울시 강남구</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addWorkplaceButton}
            onPress={handleAddWorkplace}
          >
            <Text style={styles.addWorkplaceText}>+ 다른 사업장 추가</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </ScrollView>

      <StaffTabBar activeTab="profile" />
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
  },
  headerLeft: {
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
  },
  editButton: {
    padding: 4,
  },
  editButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    marginTop: 20,
    marginBottom: 20,
    alignItems: "center",
    ...shadows.card,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  profileAvatarText: {
    color: colors.surface,
    fontSize: 32,
    fontWeight: "600",
  },
  profileName: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  profileWorkplace: {
    fontSize: 14,
    color: colors.text2,
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: colors.primaryDim,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  workInfoCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...shadows.card,
  },
  monthlyStatusCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...shadows.card,
  },
  workplaceCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...shadows.card,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.text2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  weeklyAllowanceStatus: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.success,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  workplaceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  workplaceInfo: {
    flex: 1,
  },
  workplaceName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  workplaceAddress: {
    fontSize: 12,
    color: colors.text2,
  },
  arrow: {
    fontSize: 20,
    color: colors.text2,
  },
  addWorkplaceButton: {
    paddingVertical: 12,
    marginTop: 8,
  },
  addWorkplaceText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  logoutButton: {
    alignItems: "center",
    paddingVertical: 20,
    marginBottom: 24,
  },
  logoutText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: "600",
  },
});
