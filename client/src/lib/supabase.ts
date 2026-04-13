/**
 * Supabase 클라이언트 초기화
 *
 * [보안 규칙] PLAN.MD 고정 규칙 준수:
 *   - 토큰 저장: AsyncStorage 금지 → expo-secure-store 사용
 *   - AsyncStorage는 평문(plaintext) 저장이라 토큰이 노출될 위험이 있음
 *   - expo-secure-store는 iOS Keychain / Android Keystore를 사용하여 암호화 저장
 */

import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * expo-secure-store 기반 스토리지 어댑터
 * Supabase Auth 세션(JWT access_token / refresh_token)을 암호화 저장
 *
 * 웹 환경에서는 secure-store 미지원 → sessionStorage fallback
 * (웹은 모바일처럼 Keychain이 없으므로 sessionStorage 사용)
 */
const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      return sessionStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      sessionStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      sessionStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
