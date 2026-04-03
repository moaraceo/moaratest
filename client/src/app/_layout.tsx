import AsyncStorage from "@react-native-async-storage/async-storage";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import "react-native-reanimated";
import { AttendanceProvider } from "./store/attendanceStore";
import { StaffProvider } from "./store/staffStore";
import { WorkplaceProvider } from "./store/workplaceStore";

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const prepare = async () => {
      try {
        const [isLoggedIn, userRole, workplaceId] = await Promise.all([
          AsyncStorage.getItem("@moara:isLoggedIn"),
          AsyncStorage.getItem("@moara:userRole"),
          AsyncStorage.getItem("@moara:workplaceId"),
        ]);

        if (!mounted) return;

        // Render the layout first, then navigate after paint
        setIsReady(true);

        requestAnimationFrame(() => {
          if (!mounted) return;
          SplashScreen.hideAsync().catch(() => {});

          if (isLoggedIn === "true") {
            if (userRole === "owner") {
              router.replace("/owner-dashboard");
            } else if (userRole === "staff") {
              router.replace(workplaceId ? "/staff-main" : "/invite-code");
            }
          }
          // Not logged in → stay at (tabs)/index.tsx (login screen)
        });
      } catch {
        if (!mounted) return;
        setIsReady(true);
        requestAnimationFrame(() => {
          SplashScreen.hideAsync().catch(() => {});
        });
      }
    };

    prepare();
    return () => {
      mounted = false;
    };
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <WorkplaceProvider>
      <AttendanceProvider>
        <StaffProvider>
          <ThemeProvider value={DefaultTheme}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="verify" options={{ headerShown: false }} />
              <Stack.Screen
                name="role-select"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="modal"
                options={{ presentation: "modal", title: "Modal" }}
              />
              <Stack.Screen
                name="staff-main"
                options={{ headerShown: false }}
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
              <Stack.Screen
                name="invite-code"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="owner-dashboard"
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
