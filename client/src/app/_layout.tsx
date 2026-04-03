import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import "react-native-reanimated";
import { AttendanceProvider } from "./store/attendanceStore";
import { StaffProvider } from "./store/staffStore";
import { WorkplaceProvider } from "./store/workplaceStore";

// 스플래시 화면이 자동으로 숨겨지지 않도록 설정
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  useEffect(() => {
    // 앱 준비 완료 후 스플래시 화면 숨기기
    SplashScreen.hideAsync();
  }, []);

  return (
    <WorkplaceProvider>
      <AttendanceProvider>
        <StaffProvider>
        <ThemeProvider value={DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="modal"
              options={{ presentation: "modal", title: "Modal" }}
            />
            <Stack.Screen
              name="staff-detail"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="labor-report"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="join-workplace"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="work-record-detail"
              options={{ headerShown: false }}
            />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
        </StaffProvider>
      </AttendanceProvider>
    </WorkplaceProvider>
  );
}
