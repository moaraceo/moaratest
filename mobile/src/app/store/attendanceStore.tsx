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
// 타입 (백엔드 attendance 응답 기준)
// ─────────────────────────────────────────────
export type AttendanceRecord = {
  id: string;
  staffName: string;
  staffInitial: string;
  workplaceId: string;
  clockIn: string;       // "HH:MM" (표시용)
  clockOut: string | null;
  date: string;          // "YYYY.MM.DD"
  workMinutes: number;
  actualWorkMinutes: number;
  breakMinutes: number;
  day: string;           // "(월)"
  status: "PENDING" | "CONFIRMED" | "REJECTED";
  modifyRequest: {
    originalClockOut: string;
    requestedClockOut: string;
    reason: string;
  } | null;
  // 백엔드 원본 ID (clock-out 호출 시 사용)
  rawId: string;
};

// 백엔드 행 → AttendanceRecord 변환
function toHHMM(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
const DAYS = ["(일)", "(월)", "(화)", "(수)", "(목)", "(금)", "(토)"];

function mapRow(row: Record<string, any>, userName?: string): AttendanceRecord {
  const name: string = userName ?? row.user_name ?? "";
  const dateStr: string = (row.date as string ?? "").replace(/-/g, ".");
  const d = new Date(row.date as string);
  return {
    id: row.id,
    rawId: row.id,
    staffName: name,
    staffInitial: name[0] ?? "?",
    workplaceId: row.workplace_id,
    clockIn: toHHMM(row.clock_in) ?? "",
    clockOut: toHHMM(row.clock_out),
    date: dateStr,
    workMinutes: row.work_minutes ?? 0,
    actualWorkMinutes: row.net_minutes ?? 0,
    breakMinutes: row.break_minutes ?? 60,
    day: DAYS[d.getDay()] ?? "",
    status: row.status ?? "PENDING",
    modifyRequest: row.modify_request ?? null,
  };
}

// ─────────────────────────────────────────────
// Context 타입
// ─────────────────────────────────────────────
interface AttendanceContextType {
  records: AttendanceRecord[];
  isLoaded: boolean;
  clockIn: (workplaceId: string) => Promise<void>;
  clockOut: (recordId: string) => Promise<void>;
  refreshRecords: (workplaceId?: string, dateFrom?: string, dateTo?: string) => Promise<void>;
  getRecordsByWorkplace: (workplaceId: string) => AttendanceRecord[];
  approveRecord: (recordId: string) => Promise<void>;
  approveAllRecords: () => Promise<number>;
  rejectRecord: (recordId: string) => Promise<void>;
  getPendingRecords: () => AttendanceRecord[];
  getConfirmedRecords: () => AttendanceRecord[];
  getTodayRecord: () => AttendanceRecord | null;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────
export function AttendanceProvider({ children }: { children: ReactNode }) {
  const { accessToken, user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const refreshRecords = useCallback(async (
    workplaceId?: string,
    dateFrom?: string,
    dateTo?: string,
  ) => {
    if (!accessToken) return;
    try {
      const params = new URLSearchParams();
      if (workplaceId) params.set("workplace_id", workplaceId);
      if (dateFrom)    params.set("date_from", dateFrom);
      if (dateTo)      params.set("date_to", dateTo);

      const data = await apiFetch<Record<string, any>[]>(
        `/attendance?${params.toString()}`,
        accessToken,
      );
      const mapped = (data ?? []).map((r) => mapRow(r, user?.name ?? ""));
      setRecords((prev) => {
        if (!workplaceId) return mapped;
        // 이 사업장 레코드만 교체, 나머지 유지
        const others = prev.filter((r) => r.workplaceId !== workplaceId);
        return [...others, ...mapped];
      });
    } catch (e) {
      console.error("근태 목록 불러오기 실패:", e);
    } finally {
      setIsLoaded(true);
    }
  }, [accessToken, user?.name]);

  // 로그인 시 자동 로드
  useEffect(() => {
    if (user && accessToken) {
      refreshRecords();
    } else {
      setRecords([]);
      setIsLoaded(false);
    }
  }, [user?.id, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const clockIn = useCallback(async (workplaceId: string) => {
    const data = await apiFetch<Record<string, any>>("/attendance/clock-in", accessToken, {
      method: "POST",
      body: JSON.stringify({ workplace_id: workplaceId }),
    });
    const newRecord = mapRow(data, user?.name ?? "");
    setRecords((prev) => {
      const today = new Date().toISOString().split("T")[0]!.replace(/-/g, ".");
      const filtered = prev.filter((r) => !(r.staffName === newRecord.staffName && r.date === today));
      return [...filtered, newRecord];
    });
  }, [accessToken, user?.name]);

  const clockOut = useCallback(async (recordId: string) => {
    const data = await apiFetch<Record<string, any>>(
      `/attendance/${recordId}/clock-out`,
      accessToken,
      { method: "POST" },
    );
    const updated = mapRow(data, user?.name ?? "");
    setRecords((prev) => prev.map((r) => r.id === recordId ? updated : r));
  }, [accessToken, user?.name]);

  const approveRecord = useCallback(async (recordId: string) => {
    await apiFetch(`/attendance/${recordId}/confirm`, accessToken, { method: "PATCH" });
    setRecords((prev) =>
      prev.map((r) => r.id === recordId ? { ...r, status: "CONFIRMED" as const } : r),
    );
  }, [accessToken]);

  const approveAllRecords = useCallback(async (): Promise<number> => {
    const pending = records.filter((r) => r.status === "PENDING");
    if (pending.length === 0) return 0;
    await Promise.all(
      pending.map((r) => apiFetch(`/attendance/${r.id}/confirm`, accessToken, { method: "PATCH" })),
    );
    setRecords((prev) =>
      prev.map((r) => r.status === "PENDING" ? { ...r, status: "CONFIRMED" as const } : r),
    );
    return pending.length;
  }, [accessToken, records]);

  const rejectRecord = useCallback(async (recordId: string) => {
    await apiFetch(`/attendance/${recordId}/reject`, accessToken, { method: "PATCH" });
    setRecords((prev) =>
      prev.map((r) => r.id === recordId ? { ...r, status: "REJECTED" as const } : r),
    );
  }, [accessToken]);

  const getRecordsByWorkplace = useCallback(
    (workplaceId: string) => records.filter((r) => r.workplaceId === workplaceId),
    [records],
  );

  const getPendingRecords = useCallback(
    () => records.filter((r) => r.status === "PENDING"),
    [records],
  );

  const getConfirmedRecords = useCallback(
    () => records.filter((r) => r.status === "CONFIRMED"),
    [records],
  );

  const getTodayRecord = useCallback((): AttendanceRecord | null => {
    if (!user?.name) return null;
    const today = new Date().toISOString().split("T")[0]!.replace(/-/g, ".");
    return records.find((r) => r.staffName === user.name && r.date === today) ?? null;
  }, [records, user?.name]);

  const value = useMemo<AttendanceContextType>(() => ({
    records,
    isLoaded,
    clockIn,
    clockOut,
    refreshRecords,
    getRecordsByWorkplace,
    approveRecord,
    approveAllRecords,
    rejectRecord,
    getPendingRecords,
    getConfirmedRecords,
    getTodayRecord,
  }), [
    records, isLoaded,
    clockIn, clockOut, refreshRecords, getRecordsByWorkplace,
    approveRecord, approveAllRecords, rejectRecord,
    getPendingRecords, getConfirmedRecords, getTodayRecord,
  ]);

  return (
    <AttendanceContext.Provider value={value}>
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const context = useContext(AttendanceContext);
  if (context === undefined) throw new Error("useAttendance must be used within an AttendanceProvider");
  return context;
}
