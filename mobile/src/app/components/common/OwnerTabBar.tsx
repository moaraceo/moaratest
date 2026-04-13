import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type OwnerTabBarProps = {
  activeTab: "home" | "approval" | "payroll" | "report" | "staff";
};

const TABS = [
  {
    key: "home",
    label: "홈",
    icon: require("../../../../assets/icons/tab-home.png"),
    route: "/owner-dashboard",
  },
  {
    key: "approval",
    label: "근태승인",
    icon: require("../../../../assets/icons/tab-approval.png"),
    route: "/approval",
  },
  {
    key: "payroll",
    label: "급여정산",
    icon: require("../../../../assets/icons/tab-payroll.png"),
    route: "/payroll",
  },
  {
    key: "report",
    label: "리포트",
    icon: require("../../../../assets/icons/tab-report.png"),
    route: "/labor-report",
  },
  {
    key: "staff",
    label: "직원관리",
    icon: require("../../../../assets/icons/tab-staff.png"),
    route: "/staff-manage",
  },
];

export default function OwnerTabBar({ activeTab }: OwnerTabBarProps) {
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
            onPress={() => router.push(tab.route as any)}
            activeOpacity={0.7}
          >
            <Image
              source={tab.icon}
              style={[
                styles.tabIcon,
                { tintColor: isActive ? "#2563EB" : "#94A3B8" },
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
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
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
    backgroundColor: "#2563EB",
    marginTop: 2,
  },
  tabLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "500",
  },
  tabLabelActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
});
