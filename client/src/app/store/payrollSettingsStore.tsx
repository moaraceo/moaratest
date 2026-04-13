import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  DEFAULT_PAYROLL_SETTINGS,
  PAYROLL_SETTINGS_STORAGE_KEY,
} from "../constants/workplaceDefaults";
import { WorkplacePayrollSettings } from "../utils/payroll";

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────

/** workplaceId → WorkplacePayrollSettings 맵 */
type PayrollSettingsMap = Record<string, WorkplacePayrollSettings>;

interface PayrollSettingsContextType {
  isLoaded: boolean;
  /** 특정 사업장의 급여 설정 반환 (없으면 기본값) */
  getSettings: (workplaceId: string) => WorkplacePayrollSettings;
  /** 특정 사업장의 급여 설정 저장 */
  saveSettings: (
    workplaceId: string,
    settings: WorkplacePayrollSettings,
  ) => Promise<void>;
  /** 특정 사업장의 급여 설정 초기화 (기본값 복원) */
  resetSettings: (workplaceId: string) => Promise<void>;
}

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

const PayrollSettingsContext = createContext<
  PayrollSettingsContextType | undefined
>(undefined);

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

export function PayrollSettingsProvider({ children }: { children: ReactNode }) {
  const [settingsMap, setSettingsMap] = useState<PayrollSettingsMap>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // 앱 시작 시 AsyncStorage 로드
  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(PAYROLL_SETTINGS_STORAGE_KEY);
        if (raw) {
          setSettingsMap(JSON.parse(raw) as PayrollSettingsMap);
        }
      } catch (e) {
        console.error("급여 설정 불러오기 실패:", e);
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, []);

  const persist = async (map: PayrollSettingsMap) => {
    try {
      await AsyncStorage.setItem(
        PAYROLL_SETTINGS_STORAGE_KEY,
        JSON.stringify(map),
      );
    } catch (e) {
      console.error("급여 설정 저장 실패:", e);
    }
  };

  const getSettings = useCallback(
    (workplaceId: string): WorkplacePayrollSettings => {
      return settingsMap[workplaceId] ?? { ...DEFAULT_PAYROLL_SETTINGS };
    },
    [settingsMap],
  );

  const saveSettings = useCallback(
    async (workplaceId: string, settings: WorkplacePayrollSettings) => {
      const next = { ...settingsMap, [workplaceId]: settings };
      setSettingsMap(next);
      await persist(next);
    },
    [settingsMap],
  );

  const resetSettings = useCallback(
    async (workplaceId: string) => {
      const next = { ...settingsMap, [workplaceId]: { ...DEFAULT_PAYROLL_SETTINGS } };
      setSettingsMap(next);
      await persist(next);
    },
    [settingsMap],
  );

  return (
    <PayrollSettingsContext.Provider
      value={{ isLoaded, getSettings, saveSettings, resetSettings }}
    >
      {children}
    </PayrollSettingsContext.Provider>
  );
}

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function usePayrollSettings() {
  const ctx = useContext(PayrollSettingsContext);
  if (!ctx) {
    throw new Error(
      "usePayrollSettings must be used within a PayrollSettingsProvider",
    );
  }
  return ctx;
}
