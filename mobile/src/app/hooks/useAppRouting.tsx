import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect } from "react";

export function useAppRouting() {
  useEffect(() => {
    const checkRouting = async () => {
      try {
        const [isLoggedIn, userRole, workplaceId] = await Promise.all([
          AsyncStorage.getItem("@moara:isLoggedIn"),
          AsyncStorage.getItem("@moara:userRole"),
          AsyncStorage.getItem("@moara:workplaceId"),
        ]);

        // Routing logic
        if (!isLoggedIn) {
          router.replace("/(tabs)");
        } else if (userRole === "owner") {
          router.replace("/owner-dashboard");
        } else if (userRole === "staff") {
          if (workplaceId) {
            router.replace("/staff-main");
          } else {
            router.replace("/invite-code");
          }
        }
      } catch (error) {
        console.error("Routing error:", error);
        router.replace("/(tabs)");
      }
    };

    checkRouting();
  }, []);
}
