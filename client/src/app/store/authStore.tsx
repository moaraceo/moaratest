/**
 * 커스텀 JWT 인증 스토어
 * - Supabase Auth 대신 자체 백엔드 JWT 사용
 * - 토큰은 expo-secure-store에 암호화 저장 (AsyncStorage 금지)
 */
import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type UserRole = "owner" | "staff" | "admin" | null;

export type AuthUser = {
  id: string;
  phone: string;
  name: string | null;
  role: UserRole;
};

type AuthContextType = {
  user: AuthUser | null;
  role: UserRole;
  loading: boolean;
  accessToken: string | null;
  login: (user: AuthUser, tokens: { accessToken: string; refreshToken: string }) => Promise<void>;
  signOut: () => Promise<void>;
  setRole: (role: UserRole) => void;
  updateUser: (partial: Partial<AuthUser>) => void;
};

const AUTH_USER_KEY = "moara_auth_user";
const AUTH_ACCESS_KEY = "moara_access_token";
const AUTH_REFRESH_KEY = "moara_refresh_token";

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") return sessionStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") { sessionStorage.setItem(key, value); return; }
  await SecureStore.setItemAsync(key, value);
}

async function secureDel(key: string): Promise<void> {
  if (Platform.OS === "web") { sessionStorage.removeItem(key); return; }
  await SecureStore.deleteItemAsync(key);
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  accessToken: null,
  login: async () => {},
  signOut: async () => {},
  setRole: () => {},
  updateUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [storedUser, storedToken] = await Promise.all([
          secureGet(AUTH_USER_KEY),
          secureGet(AUTH_ACCESS_KEY),
        ]);

        if (storedUser && storedToken) {
          // JWT exp 확인 (서명 미검증 — 서버가 검증함)
          const parts = storedToken.split(".");
          if (parts.length === 3) {
            const payload = JSON.parse(
              atob(parts[1]!.replace(/-/g, "+").replace(/_/g, "/"))
            ) as { exp: number };

            if (payload.exp * 1000 > Date.now()) {
              setUser(JSON.parse(storedUser) as AuthUser);
              setAccessToken(storedToken);
            } else {
              await tryRefresh();
            }
          }
        }
      } catch {
        await clearAuth();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const tryRefresh = async () => {
    try {
      const storedRefresh = await secureGet(AUTH_REFRESH_KEY);
      if (!storedRefresh) return;

      const API_URL = process.env["EXPO_PUBLIC_API_URL"] ?? "";
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: storedRefresh }),
      });

      if (!res.ok) { await clearAuth(); return; }

      const body = await res.json() as {
        ok: boolean;
        data: { tokens: { accessToken: string; refreshToken: string } };
      };
      if (!body.ok) { await clearAuth(); return; }

      const { accessToken: newAccess, refreshToken: newRefresh } = body.data.tokens;
      await Promise.all([
        secureSet(AUTH_ACCESS_KEY, newAccess),
        secureSet(AUTH_REFRESH_KEY, newRefresh),
      ]);
      setAccessToken(newAccess);

      const storedUser = await secureGet(AUTH_USER_KEY);
      if (storedUser) setUser(JSON.parse(storedUser) as AuthUser);
    } catch {
      await clearAuth();
    }
  };

  const clearAuth = async () => {
    await Promise.all([
      secureDel(AUTH_USER_KEY),
      secureDel(AUTH_ACCESS_KEY),
      secureDel(AUTH_REFRESH_KEY),
    ]);
    setUser(null);
    setAccessToken(null);
  };

  const login = async (
    newUser: AuthUser,
    tokens: { accessToken: string; refreshToken: string }
  ) => {
    await Promise.all([
      secureSet(AUTH_USER_KEY, JSON.stringify(newUser)),
      secureSet(AUTH_ACCESS_KEY, tokens.accessToken),
      secureSet(AUTH_REFRESH_KEY, tokens.refreshToken),
    ]);
    setUser(newUser);
    setAccessToken(tokens.accessToken);
  };

  const signOut = async () => {
    await clearAuth();
  };

  const setRole = (role: UserRole) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, role };
      secureSet(AUTH_USER_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  const updateUser = (partial: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...partial };
      secureSet(AUTH_USER_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        loading,
        accessToken,
        login,
        signOut,
        setRole,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
