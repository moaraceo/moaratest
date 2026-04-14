import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CURRENT_MINIMUM_WAGE } from "../constants/minimumWage";
import { useAuth } from "./authStore";
import { apiFetch } from "../utils/api";

// ─────────────────────────────────────────────
// 타입 (백엔드 user_workplaces 응답 기준)
// ─────────────────────────────────────────────
export type StaffMember = {
  id: string;           // user_workplaces.id
  userId: string;       // users.id
  name: string;
  initial: string;
  position: string;
  hourlyWage: number;
  status: "active" | "probation" | "resigned";
  joinDate: string;
  resignDate?: string;
  rejoinDate?: string;
  wageEffectiveDate?: string;
  workplaceId: string;
};

interface StaffContextType {
  staffList: StaffMember[];
  isLoaded: boolean;
  refreshStaff: (workplaceId: string) => Promise<void>;
  updateStaff: (workplaceId: string, userId: string, updates: { hourlyWage?: number; position?: string; status?: string }) => Promise<void>;
  getActiveStaff: () => StaffMember[];
  getResignedStaff: () => StaffMember[];
  isUnderMinimumWage: (hourlyWage: number) => boolean;
  getUnderWageStaff: () => StaffMember[];
  getActiveStaffByWorkplace: (workplaceId: string) => StaffMember[];
}

const StaffContext = createContext<StaffContextType | undefined>(undefined);

// ─────────────────────────────────────────────
// 백엔드 응답 → StaffMember 변환
// ─────────────────────────────────────────────
function mapRow(row: Record<string, any>): StaffMember {
  const user = row.users ?? {};
  const name: string = user.name ?? row.user_id ?? "알 수 없음";
  return {
    id: row.id,
    userId: row.user_id,
    name,
    initial: name[0] ?? "?",
    position: row.position ?? "",
    hourlyWage: row.hourly_wage ?? CURRENT_MINIMUM_WAGE,
    status: row.status ?? "active",
    joinDate: row.join_date ?? "",
    resignDate: row.resign_date ?? undefined,
    rejoinDate: row.rejoin_date ?? undefined,
    wageEffectiveDate: row.wage_effective_date ?? undefined,
    workplaceId: row.workplace_id,
  };
}

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────
export function StaffProvider({ children }: { children: ReactNode }) {
  const { accessToken, user } = useAuth();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const refreshStaff = useCallback(async (workplaceId: string) => {
    if (!accessToken) return;
    try {
      const data = await apiFetch<Record<string, any>[]>(
        `/workplaces/${workplaceId}/staff`,
        accessToken,
      );
      // 기존 다른 사업장 데이터는 유지하고 이 사업장 데이터만 교체
      setStaffList((prev) => {
        const others = prev.filter((s) => s.workplaceId !== workplaceId);
        return [...others, ...(data ?? []).map(mapRow)];
      });
    } catch (e) {
      console.error("직원 목록 불러오기 실패:", e);
    } finally {
      setIsLoaded(true);
    }
  }, [accessToken]);

  // 로그인 상태 초기화
  useEffect(() => {
    if (!user) {
      setStaffList([]);
      setIsLoaded(false);
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStaff = useCallback(async (
    workplaceId: string,
    userId: string,
    updates: { hourlyWage?: number; position?: string; status?: string },
  ) => {
    await apiFetch(`/workplaces/${workplaceId}/staff/${userId}`, accessToken, {
      method: "PATCH",
      body: JSON.stringify({
        hourly_wage: updates.hourlyWage,
        position: updates.position,
        status: updates.status,
      }),
    });
    await refreshStaff(workplaceId);
  }, [accessToken, refreshStaff]);

  const isUnderMinimumWage = useCallback(
    (hourlyWage: number) => hourlyWage < CURRENT_MINIMUM_WAGE,
    [],
  );

  const getUnderWageStaff = useCallback(
    () => staffList.filter((s) => s.status !== "resigned" && s.hourlyWage < CURRENT_MINIMUM_WAGE),
    [staffList],
  );

  const getActiveStaff = useCallback(
    () => staffList.filter((s) => s.status === "active" || s.status === "probation"),
    [staffList],
  );

  const getResignedStaff = useCallback(
    () => staffList.filter((s) => s.status === "resigned"),
    [staffList],
  );

  const getActiveStaffByWorkplace = useCallback(
    (workplaceId: string) =>
      staffList.filter(
        (s) => (s.status === "active" || s.status === "probation") && s.workplaceId === workplaceId,
      ),
    [staffList],
  );

  const value = useMemo(() => ({
    staffList,
    isLoaded,
    refreshStaff,
    updateStaff,
    getActiveStaff,
    getResignedStaff,
    isUnderMinimumWage,
    getUnderWageStaff,
    getActiveStaffByWorkplace,
  }), [
    staffList, isLoaded,
    refreshStaff, updateStaff,
    getActiveStaff, getResignedStaff, isUnderMinimumWage,
    getUnderWageStaff, getActiveStaffByWorkplace,
  ]);

  return (
    <StaffContext.Provider value={value}>
      {children}
    </StaffContext.Provider>
  );
}

export function useStaff() {
  const context = useContext(StaffContext);
  if (context === undefined) throw new Error("useStaff must be used within a StaffProvider");
  return context;
}
