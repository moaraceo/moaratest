import AsyncStorage from "@react-native-async-storage/async-storage";
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

// 직원 타입 정의
export type StaffMember = {
  id: string;
  name: string;
  initial: string; // 성 첫글자
  position: string; // 직책
  hourlyWage: number; // 시급
  status: "active" | "probation" | "resigned";
  joinDate: string; // 입사일
  resignDate?: string; // 퇴사일 (없으면 undefined)
  rejoinDate?: string; // 재입사일 (없으면 undefined)
  wageEffectiveDate?: string; // 시급 적용 시점
  /**
   * 소속 사업장 ID 목록 (1:N — 직원이 여러 사업장에서 근무 가능)
   * 초대 코드로 참여할 때 마다 여기에 추가됨
   */
  workplaceIds: string[];
};

// 저장 키 상수
const STAFF_STORAGE_KEY = "moara_staff_list";

// 초기 샘플 데이터
const INITIAL_STAFF_DATA: StaffMember[] = [
  {
    id: "1",
    name: "김민지",
    initial: "김",
    position: "홀 서빙",
    hourlyWage: Math.max(CURRENT_MINIMUM_WAGE, 10030),
    status: "active",
    joinDate: "2024.01.15",
    workplaceIds: ["workplace-1", "workplace-2"], // 강남점 + 홍대점 근무
  },
  {
    id: "2",
    name: "박준혁",
    initial: "박",
    position: "주방 보조",
    hourlyWage: Math.max(CURRENT_MINIMUM_WAGE, 10030),
    status: "active",
    joinDate: "2024.03.01",
    workplaceIds: ["workplace-1"],
  },
  {
    id: "3",
    name: "이수연",
    initial: "이",
    position: "카운터",
    hourlyWage: 10500,
    status: "active",
    joinDate: "2024.06.01",
    workplaceIds: ["workplace-1"],
  },
  {
    id: "4",
    name: "최태양",
    initial: "최",
    position: "홀 서빙",
    hourlyWage: Math.max(CURRENT_MINIMUM_WAGE, 10030),
    status: "probation",
    joinDate: "2025.02.01",
    workplaceIds: ["workplace-1"],
  },
  {
    id: "5",
    name: "정수진",
    initial: "정",
    position: "주방 보조",
    hourlyWage: Math.max(CURRENT_MINIMUM_WAGE, 10030),
    status: "resigned",
    joinDate: "2024.01.01",
    resignDate: "2025.01.31",
    workplaceIds: ["workplace-1"],
  },
];

// Context 타입
interface StaffContextType {
  staffList: StaffMember[];
  isLoaded: boolean;
  updateStaff: (id: string, updates: Partial<StaffMember>) => void;
  resignStaff: (id: string) => void;
  rejoinStaff: (id: string) => void;
  clearStaffData: () => Promise<void>;
  getActiveStaff: () => StaffMember[];
  getResignedStaff: () => StaffMember[];
  isUnderMinimumWage: (hourlyWage: number) => boolean;
  getUnderWageStaff: () => StaffMember[];
  /** 특정 직원을 새 사업장에 추가 (초대 코드 참여 후 호출) */
  addStaffToWorkplace: (staffId: string, workplaceId: string) => void;
  /** 사업장 기준 재직중 직원 필터 */
  getActiveStaffByWorkplace: (workplaceId: string) => StaffMember[];
}

const StaffContext = createContext<StaffContextType | undefined>(undefined);

// Provider 컴포넌트
export function StaffProvider({ children }: { children: ReactNode }) {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 앱 시작 시 저장된 데이터 불러오기
  useEffect(() => {
    const loadStaff = async () => {
      try {
        const saved = await AsyncStorage.getItem(STAFF_STORAGE_KEY);
        if (saved) {
          setStaffList(JSON.parse(saved));
        } else {
          // 저장된 데이터가 없으면 샘플 데이터로 초기화
          setStaffList(INITIAL_STAFF_DATA);
        }
      } catch (error) {
        console.error("직원 데이터 불러오기 실패:", error);
        setStaffList(INITIAL_STAFF_DATA); // 에러 시 샘플 데이터로 초기화
      } finally {
        setIsLoaded(true);
      }
    };
    loadStaff();
  }, []);

  // 데이터 변경 시 자동 저장
  useEffect(() => {
    const saveStaff = async () => {
      try {
        await AsyncStorage.setItem(
          STAFF_STORAGE_KEY,
          JSON.stringify(staffList),
        );
      } catch (error) {
        console.error("직원 데이터 저장 실패:", error);
      }
    };
    if (isLoaded && staffList.length > 0) {
      saveStaff();
    }
  }, [staffList, isLoaded]);

  const isUnderMinimumWage = useCallback(
    (hourlyWage: number) => hourlyWage < CURRENT_MINIMUM_WAGE,
    [],
  );

  const getUnderWageStaff = useCallback(
    () => staffList.filter((s) => s.status !== "resigned" && s.hourlyWage < CURRENT_MINIMUM_WAGE),
    [staffList],
  );

  const updateStaff = useCallback((id: string, updates: Partial<StaffMember>) => {
    setStaffList((prev) =>
      prev.map((staff) => (staff.id === id ? { ...staff, ...updates } : staff)),
    );
  }, []);

  const resignStaff = useCallback((id: string) => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;
    setStaffList((prev) =>
      prev.map((s) => s.id === id ? { ...s, status: "resigned" as const, resignDate: dateStr } : s),
    );
  }, []);

  const rejoinStaff = useCallback((id: string) => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;
    setStaffList((prev) =>
      prev.map((s) => s.id === id ? { ...s, status: "active" as const, rejoinDate: dateStr } : s),
    );
  }, []);

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
        (s) => (s.status === "active" || s.status === "probation") && s.workplaceIds.includes(workplaceId),
      ),
    [staffList],
  );

  const addStaffToWorkplace = useCallback((staffId: string, workplaceId: string) => {
    setStaffList((prev) =>
      prev.map((s) => {
        if (s.id !== staffId || s.workplaceIds.includes(workplaceId)) return s;
        return { ...s, workplaceIds: [...s.workplaceIds, workplaceId] };
      }),
    );
  }, []);

  const clearStaffData = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STAFF_STORAGE_KEY);
      setStaffList(INITIAL_STAFF_DATA);
    } catch (error) {
      console.error("초기화 실패:", error);
    }
  }, []);

  const value = useMemo(() => ({
    staffList,
    isLoaded,
    updateStaff,
    resignStaff,
    rejoinStaff,
    clearStaffData,
    getActiveStaff,
    getResignedStaff,
    isUnderMinimumWage,
    getUnderWageStaff,
    addStaffToWorkplace,
    getActiveStaffByWorkplace,
  }), [
    staffList, isLoaded,
    updateStaff, resignStaff, rejoinStaff, clearStaffData,
    getActiveStaff, getResignedStaff, isUnderMinimumWage,
    getUnderWageStaff, addStaffToWorkplace, getActiveStaffByWorkplace,
  ]);

  return (
    <StaffContext.Provider value={value}>
      {children}
    </StaffContext.Provider>
  );
}

// Hook for using staff context
export function useStaff() {
  const context = useContext(StaffContext);
  if (context === undefined) {
    throw new Error("useStaff must be used within a StaffProvider");
  }
  return context;
}
