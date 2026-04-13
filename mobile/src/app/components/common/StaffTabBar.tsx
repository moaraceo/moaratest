import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../../constants/theme";

type StaffTabBarProps = {
  activeTab: "workplace" | "history" | "payslip" | "profile";
};

// 탭 순서: 사업장 → 기록 → 급여 → 설정
const TABS = [
  {
    key: "workplace",
    label: "사업장",
    icon: require("../../../../assets/icons/tab-home.png"),
    route: "/staff-main", // 사업장 탭 = 직원 홈(staff-main)
  },
  {
    key: "history",
    label: "기록",
    icon: require("../../../../assets/icons/tab-history.png"),
    route: "/work-history",
  },
  {
    key: "payslip",
    label: "급여",
    icon: require("../../../../assets/icons/tab-payslip.png"),
    route: "/payslip",
  },
  {
    key: "profile",
    label: "설정",
    icon: require("../../../../assets/icons/tab-profile.png"),
    route: "/profile",
  },
];

export default function StaffTabBar({ activeTab }: StaffTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => router.replace(tab.route as any)}
            activeOpacity={0.7}
          >
            <Image
              source={tab.icon}
              style={[
                styles.tabIcon,
                { tintColor: isActive ? colors.primary : colors.text3 },
              ]}
            />
            {isActive && <View style={styles.activeDot} />}
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  tabIcon: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
  tabLabel: {
    fontSize: 10,
    color: colors.text3,
    fontWeight: "500",
  },
  tabLabelActive: {
    color: colors.primary,
  },
});
