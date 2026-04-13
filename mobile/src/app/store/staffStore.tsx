import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
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

  // 최저시급 미달 여부 확인
  const isUnderMinimumWage = (hourlyWage: number): boolean => {
    return hourlyWage < CURRENT_MINIMUM_WAGE;
  };

  // 최저시급 미달 직원 목록 반환
  const getUnderWageStaff = (): StaffMember[] => {
    return staffList.filter(
      (s) => s.status !== "resigned" && s.hourlyWage < CURRENT_MINIMUM_WAGE,
    );
  };

  // 오늘 날짜 가져오기
  const getTodayDate = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    return `${year}.${month}.${day}`;
  };

  // 직원 정보 수정
  const updateStaff = (id: string, updates: Partial<StaffMember>) => {
    setStaffList((prev) =>
      prev.map((staff) => (staff.id === id ? { ...staff, ...updates } : staff)),
    );
  };

  // 퇴사 처리
  const resignStaff = (id: string) => {
    const today = getTodayDate();
    updateStaff(id, {
      status: "resigned",
      resignDate: today,
    });
  };

  // 재입사 처리
  const rejoinStaff = (id: string) => {
    const today = getTodayDate();
    updateStaff(id, {
      status: "active",
      rejoinDate: today,
    });
  };

  // 재직중 직원 목록
  const getActiveStaff = (): StaffMember[] => {
    return staffList.filter(
      (staff) => staff.status === "active" || staff.status === "probation",
    );
  };

  // 퇴사 직원 목록
  const getResignedStaff = (): StaffMember[] => {
    return staffList.filter((staff) => staff.status === "resigned");
  };

  // 특정 사업장의 재직중 직원
  const getActiveStaffByWorkplace = (workplaceId: string): StaffMember[] => {
    return staffList.filter(
      (staff) =>
        (staff.status === "active" || staff.status === "probation") &&
        staff.workplaceIds.includes(workplaceId),
    );
  };

  // 초대 코드 참여 후 직원을 사업장에 추가
  const addStaffToWorkplace = (staffId: string, workplaceId: string) => {
    setStaffList((prev) =>
      prev.map((staff) => {
        if (staff.id !== staffId) return staff;
        if (staff.workplaceIds.includes(workplaceId)) return staff; // 이미 속해있으면 무시
        return { ...staff, workplaceIds: [...staff.workplaceIds, workplaceId] };
      }),
    );
  };

  // 데이터 초기화 기능
  const clearStaffData = async () => {
    try {
      await AsyncStorage.removeItem(STAFF_STORAGE_KEY);
      setStaffList(INITIAL_STAFF_DATA); // 샘플 데이터로 리셋
    } catch (error) {
      console.error("초기화 실패:", error);
    }
  };

  return (
    <StaffContext.Provider
      value={{
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
      }}
    >
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
