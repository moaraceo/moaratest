import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./authStore";
import { apiFetch } from "../utils/api";

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────

export type IndustryCode =
  | 'cafe' | 'restaurant' | 'bar' | 'convenience'
  | 'retail' | 'academy' | 'beauty' | 'other';

export type Workplace = {
  id: string;
  name: string;
  address: string;
  owner_id: string;
  invite_code: string;
  invite_code_expiry: string;
  created_at: string;
  industry_code: IndustryCode | null;
  region_code: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
};

// ─────────────────────────────────────────────
// Context 타입
// ─────────────────────────────────────────────
interface WorkplaceContextType {
  workplaces: Workplace[];
  currentWorkplaceId: string | null;
  isLoaded: boolean;
  setCurrentWorkplace: (id: string) => void;
  getCurrentWorkplace: () => Workplace | null;
  refreshWorkplaces: () => Promise<void>;
  generateInviteCode: (workplaceId: string) => Promise<string>;
  joinByInviteCode: (code: string) => Promise<{ success: boolean; workplace?: Workplace; error?: string }>;
  updateWorkplace: (workplaceId: string, updates: Partial<Pick<Workplace, "name" | "address" | "industry_code">>) => Promise<void>;
  addWorkplace: (name: string, address: string, industryCode?: IndustryCode, gpsLat?: number, gpsLng?: number) => Promise<Workplace>;
}

const WorkplaceContext = createContext<WorkplaceContextType | undefined>(undefined);

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────
export function WorkplaceProvider({ children }: { children: ReactNode }) {
  const { accessToken, user } = useAuth();
  const [workplaces, setWorkplaces] = useState<Workplace[]>([]);
  const [currentWorkplaceId, setCurrentWorkplaceIdState] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const refreshWorkplaces = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await apiFetch<Workplace[]>("/workplaces", accessToken);
      setWorkplaces(data);
      if (data.length > 0 && !currentWorkplaceId) {
        setCurrentWorkplaceIdState(data[0]!.id);
      }
    } catch (e) {
      console.error("사업장 목록 불러오기 실패:", e);
    } finally {
      setIsLoaded(true);
    }
  }, [accessToken, currentWorkplaceId]);

  // 로그인 후 자동 로드
  useEffect(() => {
    if (user && accessToken) {
      refreshWorkplaces();
    } else {
      setWorkplaces([]);
      setCurrentWorkplaceIdState(null);
      setIsLoaded(false);
    }
  }, [user?.id, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const setCurrentWorkplace = useCallback((id: string) => {
    setCurrentWorkplaceIdState(id);
  }, []);

  const getCurrentWorkplace = useCallback(
    (): Workplace | null => workplaces.find((w) => w.id === currentWorkplaceId) ?? null,
    [workplaces, currentWorkplaceId],
  );

  const generateInviteCode = useCallback(async (workplaceId: string): Promise<string> => {
    const data = await apiFetch<{ invite_code: string }>(
      `/workplaces/${workplaceId}/invite-code`,
      accessToken,
      { method: "POST" },
    );
    await refreshWorkplaces();
    return data.invite_code;
  }, [accessToken, refreshWorkplaces]);

  const joinByInviteCode = useCallback(async (
    code: string,
  ): Promise<{ success: boolean; workplace?: Workplace; error?: string }> => {
    try {
      const data = await apiFetch<{ workplace: Workplace; already_member: boolean }>(
        "/workplaces/join",
        accessToken,
        { method: "POST", body: JSON.stringify({ invite_code: code }) },
      );
      await refreshWorkplaces();
      return { success: true, workplace: data.workplace };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "오류가 발생했습니다." };
    }
  }, [accessToken, refreshWorkplaces]);

  const updateWorkplace = useCallback(async (
    workplaceId: string,
    updates: Partial<Pick<Workplace, "name" | "address" | "industry_code">>,
  ) => {
    await apiFetch(`/workplaces/${workplaceId}`, accessToken, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
    await refreshWorkplaces();
  }, [accessToken, refreshWorkplaces]);

  const addWorkplace = useCallback(async (
    name: string,
    address: string,
    industryCode?: IndustryCode,
    gpsLat?: number,
    gpsLng?: number,
  ): Promise<Workplace> => {
    const data = await apiFetch<Workplace>("/workplaces", accessToken, {
      method: "POST",
      body: JSON.stringify({ name, address, industry_code: industryCode, gps_lat: gpsLat, gps_lng: gpsLng }),
    });
    await refreshWorkplaces();
    return data;
  }, [accessToken, refreshWorkplaces]);

  const value = useMemo(() => ({
    workplaces,
    currentWorkplaceId,
    isLoaded,
    setCurrentWorkplace,
    getCurrentWorkplace,
    refreshWorkplaces,
    generateInviteCode,
    joinByInviteCode,
    updateWorkplace,
    addWorkplace,
  }), [
    workplaces, currentWorkplaceId, isLoaded,
    setCurrentWorkplace, getCurrentWorkplace, refreshWorkplaces,
    generateInviteCode, joinByInviteCode, updateWorkplace, addWorkplace,
  ]);

  return (
    <WorkplaceContext.Provider value={value}>
      {children}
    </WorkplaceContext.Provider>
  );
}

export function useWorkplace() {
  const context = useContext(WorkplaceContext);
  if (!context) throw new Error("useWorkplace must be used within a WorkplaceProvider");
  return context;
}
