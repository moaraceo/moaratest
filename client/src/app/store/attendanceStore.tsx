import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

// 근태 기록 타입
export type AttendanceRecord = {
  id: string;
  staffName: string; // 직원 이름
  staffInitial: string; // 성 첫글자
  /**
   * 어느 사업장에서 찍은 기록인지 (다중 사업장 지원 핵심)
   * 백엔드 붙이기 전 AsyncStorage 단계에서도 미리 반영
   */
  workplaceId: string;
  clockIn: string; // 출근 시각 (예: "09:02")
  clockOut: string | null; // 퇴근 시각 (null이면 근무중)
  date: string; // 날짜 (예: "2025.03.14")
  workMinutes: number; // 실근무시간 (분)
  actualWorkMinutes: number; // 실 근무시간 (휴게시간 제외)
  breakMinutes: number; // 휴게시간 (분)
  day: string; // 요일 (예: "(목)")
  status: "PENDING" | "CONFIRMED" | "REJECTED";
  // PENDING: 미승인 (직원이 기록, 사장 미확인)
  // CONFIRMED: 승인 완료 (급여 계산 반영)
  // REJECTED: 반려
  modifyRequest: {
    // 수정 요청 (없으면 null)
    originalClockOut: string;
    requestedClockOut: string;
    reason: string;
  } | null;
};

// 저장 키 상수 정의
const STORAGE_KEY = "moara_attendance_records";

// Context 타입
interface AttendanceContextType {
  records: AttendanceRecord[];
  isLoaded: boolean;
  clockIn: (staffName: string, staffInitial: string, workplaceId: string) => void;
  clockOut: (recordId: string) => void;
  clockOutWithBreak: (recordId: string, clockOutTime: string, breakMinutes: number) => void;
  /** 특정 사업장의 기록만 필터 */
  getRecordsByWorkplace: (workplaceId: string) => AttendanceRecord[];
  approveRecord: (recordId: string) => void;
  rejectRecord: (recordId: string) => void;
  clearAllData: () => Promise<void>;
  getPendingRecords: () => AttendanceRecord[];
  getConfirmedRecords: () => AttendanceRecord[];
  getTodayRecord: (staffName: string) => AttendanceRecord | null;
}

// Context 생성
const AttendanceContext = createContext<AttendanceContextType | undefined>(
  undefined,
);

// Provider 컴포넌트
export function AttendanceProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 앱 시작 시 저장된 데이터 불러오기
  useEffect(() => {
    const loadData = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          setRecords(JSON.parse(saved));
        } else {
          // 저장된 데이터가 없으면 샘플 데이터로 초기화
          setRecords([
            {
              id: "1",
              staffName: "김민지",
              staffInitial: "김",
              workplaceId: "workplace-1",
              clockIn: "09:02",
              clockOut: "18:05",
              date: "2025.03.14",
              workMinutes: 543,
              actualWorkMinutes: 483,
              breakMinutes: 60,
              day: "(목)",
              status: "PENDING",
              modifyRequest: {
                originalClockOut: "18:05",
                requestedClockOut: "20:00",
                reason: "마감 작업으로 20시 퇴근",
              },
            },
            {
              id: "2",
              staffName: "박준혁",
              staffInitial: "박",
              workplaceId: "workplace-1",
              clockIn: "10:15",
              clockOut: "18:00",
              date: "2025.03.14",
              workMinutes: 465,
              actualWorkMinutes: 405,
              breakMinutes: 60,
              day: "(목)",
              status: "PENDING",
              modifyRequest: null,
            },
            {
              id: "3",
              staffName: "이수연",
              staffInitial: "이",
              workplaceId: "workplace-1",
              clockIn: "08:50",
              clockOut: "17:30",
              date: "2025.03.14",
              workMinutes: 520,
              actualWorkMinutes: 460,
              breakMinutes: 60,
              day: "(목)",
              status: "CONFIRMED",
              modifyRequest: null,
            },
          ]);
        }
      } catch (error) {
        console.error("근태 데이터 불러오기 실패:", error);
      } finally {
        setIsLoaded(true); // 성공/실패 상관없이 완료 처리
      }
    };
    loadData();
  }, []);

  // 데이터 변경 시 자동 저장
  useEffect(() => {
    const saveData = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      } catch (error) {
        console.error("근태 데이터 저장 실패:", error);
      }
    };
    if (isLoaded && records.length > 0) {
      saveData();
    }
  }, [records, isLoaded]);

  // 현재 시각 가져오기
  const getCurrentTime = (): string => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  // 오늘 날짜 가져오기
  const getTodayDate = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    return `${year}.${month}.${day}`;
  };

  // 요일 가져오기
  const getDayOfWeek = (): string => {
    const days = ["(일)", "(월)", "(화)", "(수)", "(목)", "(금)", "(토)"];
    return days[new Date().getDay()];
  };

  // 시간 문자열을 분으로 변환
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // 분 단위 근무시간 계산
  const calculateWorkMinutes = (clockIn: string, clockOut: string): number => {
    return timeToMinutes(clockOut) - timeToMinutes(clockIn);
  };

  // 출근 기록
  const clockIn = (
    staffName: string,
    staffInitial: string,
    workplaceId: string,
  ) => {
    const today = getTodayDate();
    const newRecord: AttendanceRecord = {
      id: `${Date.now()}-${staffName}`,
      staffName,
      staffInitial,
      workplaceId,
      clockIn: getCurrentTime(),
      clockOut: null,
      date: today,
      workMinutes: 0,
      actualWorkMinutes: 0,
      breakMinutes: 60,
      day: getDayOfWeek(),
      status: "PENDING",
      modifyRequest: null,
    };

    setRecords((prev) => {
      // 오늘 날짜의 기존 기록이 있으면 제거
      const filtered = prev.filter(
        (r) => !(r.staffName === staffName && r.date === today),
      );
      return [...filtered, newRecord];
    });
  };

  // 퇴근 기록
  const clockOut = (recordId: string) => {
    const clockOutTime = getCurrentTime();

    setRecords((prev) =>
      prev.map((record) => {
        if (record.id === recordId && record.clockIn) {
          const workMinutes = calculateWorkMinutes(
            record.clockIn,
            clockOutTime,
          );
          return {
            ...record,
            clockOut: clockOutTime,
            workMinutes,
            status: "PENDING",
          };
        }
        return record;
      }),
    );
  };

  // 퇴근 + 휴게시간 일괄 기록 (break_select 제출 시 사용)
  const clockOutWithBreak = (
    recordId: string,
    clockOutTime: string,
    breakMinutes: number,
  ) => {
    setRecords((prev) =>
      prev.map((record) => {
        if (record.id === recordId && record.clockIn) {
          const workMinutes = calculateWorkMinutes(record.clockIn, clockOutTime);
          const actualWorkMinutes = Math.max(0, workMinutes - breakMinutes);
          return {
            ...record,
            clockOut: clockOutTime,
            workMinutes,
            breakMinutes,
            actualWorkMinutes,
            status: "PENDING",
          };
        }
        return record;
      }),
    );
  };

  // 근태 승인
  const approveRecord = (recordId: string) => {
    setRecords((prev) =>
      prev.map((record) =>
        record.id === recordId ? { ...record, status: "CONFIRMED" } : record,
      ),
    );
  };

  // 근태 반려
  const rejectRecord = (recordId: string) => {
    setRecords((prev) =>
      prev.map((record) =>
        record.id === recordId ? { ...record, status: "REJECTED" } : record,
      ),
    );
  };

  // 데이터 초기화 기능
  const clearAllData = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setRecords([]);
    } catch (error) {
      console.error("초기화 실패:", error);
    }
  };

  // 미승인 목록
  const getPendingRecords = (): AttendanceRecord[] => {
    return records.filter((record) => record.status === "PENDING");
  };

  // 확정 목록
  const getConfirmedRecords = (): AttendanceRecord[] => {
    return records.filter((record) => record.status === "CONFIRMED");
  };

  // 오늘 특정 직원의 기록
  const getTodayRecord = (staffName: string): AttendanceRecord | null => {
    const today = getTodayDate();
    return (
      records.find((r) => r.staffName === staffName && r.date === today) || null
    );
  };

  // 특정 사업장 기록 필터
  const getRecordsByWorkplace = (workplaceId: string): AttendanceRecord[] => {
    return records.filter((r) => r.workplaceId === workplaceId);
  };

  const value: AttendanceContextType = {
    records,
    isLoaded,
    clockIn,
    clockOut,
    clockOutWithBreak,
    approveRecord,
    rejectRecord,
    clearAllData,
    getPendingRecords,
    getConfirmedRecords,
    getTodayRecord,
    getRecordsByWorkplace,
  };

  return (
    <AttendanceContext.Provider value={value}>
      {children}
    </AttendanceContext.Provider>
  );
}

// Hook으로 Context 사용
export function useAttendance() {
  const context = useContext(AttendanceContext);
  if (context === undefined) {
    throw new Error("useAttendance must be used within an AttendanceProvider");
  }
  return context;
}
