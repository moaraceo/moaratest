import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type OwnerTabBarProps = {
  activeTab: "home" | "approval" | "payroll" | "report" | "staff";
};

const TABS = [
  {
    key: "home",
    label: "홈",
    icon: require("/Users/jinna/moara/client/assets/icons/tab-home.png"),
    route: "/owner-dashboard",
  },
  {
    key: "approval",
    label: "근태승인",
    icon: require("/Users/jinna/moara/client/assets/icons/tab-approval.png"),
    route: "/approval",
  },
  {
    key: "payroll",
    label: "급여정산",
    icon: require("/Users/jinna/moara/client/assets/icons/tab-payroll.png"),
    route: "/payroll",
  },
  {
    key: "report",
    label: "리포트",
    icon: require("/Users/jinna/moara/client/assets/icons/tab-report.png"),
    route: "/labor-report",
  },
  {
    key: "staff",
    label: "직원관리",
    icon: require("/Users/jinna/moara/client/assets/icons/tab-staff.png"),
    route: "/staff-manage",
  },
];

export default function OwnerTabBar({ activeTab }: OwnerTabBarProps) {
  const router = useRouter();
  return (
    <View style={styles.tabBar}>
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
    backgroundColor: "#1A1D27",
    borderTopWidth: 1,
    borderTopColor: "#2E3347",
    paddingTop: 8,
    paddingBottom: 20,
    height: 72,
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
    backgroundColor: "#4A9EFF",
    marginTop: 2,
  },
  tabLabel: {
    fontSize: 10,
    color: "#555D75",
    fontWeight: "500",
  },
  tabLabelActive: {
    color: "#4A9EFF",
  },
});
