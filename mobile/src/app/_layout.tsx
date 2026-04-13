import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import "react-native-reanimated";
import { AuthProvider, useAuth } from "./store/authStore";
import { AttendanceProvider } from "./store/attendanceStore";
import { PayrollSettingsProvider } from "./store/payrollSettingsStore";
import { StaffProvider } from "./store/staffStore";
import { WorkplaceProvider } from "./store/workplaceStore";

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

function AppNavigator() {
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    SplashScreen.hideAsync().catch(() => {});

    if (!user) {
      // 로그인 안 됨 → 랜딩/로그인 화면
      router.replace("/(tabs)");
      return;
    }

    // 로그인 됨 → role 확인
    if (role === "admin") {
      // Moara 운영팀 → admin 대시보드
      router.replace("/admin-dashboard");
    } else if (role === "owner") {
      router.replace("/owner-dashboard");
    } else if (role === "staff") {
      router.replace("/staff-main");
    } else {
      // role 아직 미설정 (신규 회원가입 직후)
      router.replace("/role-select");
    }
  }, [user, role, loading]);

  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="verify" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="email-login" options={{ headerShown: false }} />
        <Stack.Screen name="role-select" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
        <Stack.Screen name="staff-main" options={{ headerShown: false }} />
        <Stack.Screen name="staff-detail" options={{ headerShown: false }} />
        <Stack.Screen name="labor-report" options={{ headerShown: false }} />
        <Stack.Screen name="join-workplace" options={{ headerShown: false }} />
        <Stack.Screen name="work-record-detail" options={{ headerShown: false }} />
        <Stack.Screen name="invite-code" options={{ headerShown: false }} />
        <Stack.Screen name="owner-dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="owner-payroll-settings" options={{ headerShown: false }} />
        <Stack.Screen name="register-workplace" options={{ headerShown: false }} />
        <Stack.Screen name="owner-invite" options={{ headerShown: false }} />
        <Stack.Screen name="workplace-settings" options={{ headerShown: false }} />
        {/* Admin 전용 화면 */}
        <Stack.Screen name="admin-dashboard" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <WorkplaceProvider>
        <PayrollSettingsProvider>
          <AttendanceProvider>
            <StaffProvider>
              <AppNavigator />
            </StaffProvider>
          </AttendanceProvider>
        </PayrollSettingsProvider>
      </WorkplaceProvider>
    </AuthProvider>
  );
}
