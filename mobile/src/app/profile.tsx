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
import { useAuth } from "./store/authStore";
import { useStaff } from "./store/staffStore";
import { useWorkplace } from "./store/workplaceStore";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { staffList } = useStaff();
  const { workplaces, currentWorkplaceId, setCurrentWorkplace } = useWorkplace();

  const currentStaff =
    staffList.find((s) => s.userId === user?.id) ?? staffList[0];
  // 직원이 속한 사업장 — workplaceStore는 이미 이 유저 소속 사업장만 로드함
  const myWorkplaces = workplaces;

  const handleEdit = () => {
    Alert.alert("편집", "프로필 편집 기능은 준비 중입니다.");
  };

  const handleLogout = () => {
    Alert.alert("로그아웃", "로그아웃하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        onPress: async () => {
          await signOut();
          router.replace("/");
        },
      },
    ]);
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
        {/* Profile Card - compact */}
        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{user?.name?.[0] ?? "?"}</Text>
            </View>
            <View style={styles.profileNameCol}>
              <Text style={styles.profileName}>{user?.name ?? "알 수 없음"}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>직원</Text>
              </View>
            </View>
          </View>

          {/* 사업장 목록 - 이름 바로 아래 */}
          <View style={styles.workplaceList}>
            {myWorkplaces.map((wp) => (
              <TouchableOpacity
                key={wp.id}
                style={[
                  styles.workplaceRow,
                  wp.id === currentWorkplaceId && styles.workplaceRowActive,
                ]}
                onPress={() => setCurrentWorkplace(wp.id)}
              >
                <Text
                  style={[
                    styles.workplaceName,
                    wp.id === currentWorkplaceId && styles.workplaceNameActive,
                  ]}
                >
                  {wp.name}
                </Text>
                {wp.id === currentWorkplaceId && (
                  <Text style={styles.workplaceCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.addWorkplaceRow}
              onPress={() => router.push("/join-workplace")}
            >
              <Text style={styles.addWorkplaceText}>+ 다른 사업장 추가</Text>
            </TouchableOpacity>
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
    paddingHorizontal: 20,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 16,
    marginBottom: 16,
    ...shadows.card,
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  profileAvatarText: {
    color: colors.surface,
    fontSize: 22,
    fontWeight: "600",
  },
  profileNameCol: {
    flex: 1,
    gap: 6,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primaryDim,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  // 사업장 목록 (프로필 카드 내부)
  workplaceList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    gap: 4,
  },
  workplaceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.bg,
  },
  workplaceRowActive: {
    backgroundColor: colors.primaryDim,
  },
  workplaceName: {
    fontSize: 14,
    color: colors.text2,
    fontWeight: "500",
  },
  workplaceNameActive: {
    color: colors.primary,
    fontWeight: "600",
  },
  workplaceCheck: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "700",
  },
  addWorkplaceRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "flex-start",
  },
  addWorkplaceText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "500",
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
