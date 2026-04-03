import { useRouter } from "expo-router";
import React from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type StaffTabBarProps = {
  activeTab: 'home' | 'history' | 'payslip' | 'profile';
};

const TABS = [
  {
    key: 'home',
    label: '홈',
    icon: require('/Users/jinna/moara/client/assets/icons/tab-home.png'),
    route: '/staff-main'
  },
  {
    key: 'history',
    label: '근무이력',
    icon: require('/Users/jinna/moara/client/assets/icons/tab-history.png'),
    route: '/work-history'
  },
  {
    key: 'payslip',
    label: '급여명세서',
    icon: require('/Users/jinna/moara/client/assets/icons/tab-payslip.png'),
    route: '/payslip'
  },
  {
    key: 'profile',
    label: '내정보',
    icon: require('/Users/jinna/moara/client/assets/icons/tab-profile.png'),
    route: '/profile'
  },
];

export default function StaffTabBar({ activeTab }: StaffTabBarProps) {
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
                { tintColor: isActive ? "#2563EB" : "#94A3B8" }
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
    backgroundColor: "#2563EB",
    marginTop: 2,
  },
  tabLabel: {
    fontSize: 10,
    color: "#555D75",
    fontWeight: "500",
  },
  tabLabelActive: {
    color: "#2563EB",
  },
});
