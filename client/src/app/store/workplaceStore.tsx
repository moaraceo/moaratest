import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────

/** 사업장 타입 (사장 1명 : 사업장 N개 구조) */
export type Workplace = {
  id: string;
  name: string;        // "OO카페 강남점"
  address: string;
  ownerId: string;     // FK → owner (1:N 설계 핵심)
  inviteCode: string;  // 6자리 영숫자 (직원 초대용)
  inviteCodeExpiry: string; // ISO 8601, 생성 후 24시간 유효
  createdAt: string;
};

// ─────────────────────────────────────────────
// 저장 키
// ─────────────────────────────────────────────
const WORKPLACES_KEY = "moara_workplaces";
const CURRENT_WP_KEY = "moara_current_workplace_id";

// ─────────────────────────────────────────────
// 샘플 데이터 (카페 2개 운영 사장님 시나리오)
// ─────────────────────────────────────────────
const makeExpiry = () =>
  new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

const INITIAL_WORKPLACES: Workplace[] = [
  {
    id: "workplace-1",
    name: "OO카페 강남점",
    address: "서울시 강남구 테헤란로 123",
    ownerId: "owner-1",
    inviteCode: "A1B2C3",
    inviteCodeExpiry: makeExpiry(),
    createdAt: "2024.01.01",
  },
  {
    id: "workplace-2",
    name: "OO카페 홍대점",
    address: "서울시 마포구 와우산로 45",
    ownerId: "owner-1",
    inviteCode: "D4E5F6",
    inviteCodeExpiry: makeExpiry(),
    createdAt: "2024.06.01",
  },
];

// ─────────────────────────────────────────────
// Context 타입
// ─────────────────────────────────────────────
interface WorkplaceContextType {
  workplaces: Workplace[];
  currentWorkplaceId: string;
  isLoaded: boolean;
  /** 현재 선택된 사업장 변경 (사장/직원 공통) */
  setCurrentWorkplace: (id: string) => void;
  /** 현재 사업장 객체 반환 */
  getCurrentWorkplace: () => Workplace | null;
  /** 사장님 소유 사업장 목록 (ownerId 기준) */
  getOwnerWorkplaces: (ownerId: string) => Workplace[];
  /** 직원이 속한 사업장 목록 (workplaceIds 배열 기준) */
  getStaffWorkplaces: (workplaceIds: string[]) => Workplace[];
  /** 초대 코드 재발급 (6자리, 24시간 유효) */
  generateInviteCode: (workplaceId: string) => string;
  /** 초대 코드로 사업장 조회·검증 */
  joinByInviteCode: (code: string) => {
    success: boolean;
    workplace?: Workplace;
    error?: string;
  };
  /** 새 사업장 추가 (사장님) */
  addWorkplace: (name: string, address: string, ownerId: string) => Workplace;
}

// ─────────────────────────────────────────────
// 내부 유틸: 6자리 코드 생성
// 혼동되는 O, I, 0, 1 제외
// ─────────────────────────────────────────────
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode(len = 6): string {
  let code = "";
  for (let i = 0; i < len; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

// ─────────────────────────────────────────────
// Context & Provider
// ─────────────────────────────────────────────
const WorkplaceContext = createContext<WorkplaceContextType | undefined>(
  undefined,
);

export function WorkplaceProvider({ children }: { children: ReactNode }) {
  const [workplaces, setWorkplaces] = useState<Workplace[]>([]);
  const [currentWorkplaceId, setCurrentWorkplaceIdState] = useState(
    "workplace-1",
  );
  const [isLoaded, setIsLoaded] = useState(false);

  // 앱 시작 시 AsyncStorage 로드
  useEffect(() => {
    const load = async () => {
      try {
        const [savedWP, savedCurrent] = await Promise.all([
          AsyncStorage.getItem(WORKPLACES_KEY),
          AsyncStorage.getItem(CURRENT_WP_KEY),
        ]);
        setWorkplaces(
          savedWP ? (JSON.parse(savedWP) as Workplace[]) : INITIAL_WORKPLACES,
        );
        if (savedCurrent) setCurrentWorkplaceIdState(savedCurrent);
      } catch {
        setWorkplaces(INITIAL_WORKPLACES);
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, []);

  // 사업장 목록 변경 시 자동 저장
  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(WORKPLACES_KEY, JSON.stringify(workplaces)).catch(
      console.error,
    );
  }, [workplaces, isLoaded]);

  // ── Actions ──────────────────────────────────

  const setCurrentWorkplace = (id: string) => {
    setCurrentWorkplaceIdState(id);
    AsyncStorage.setItem(CURRENT_WP_KEY, id).catch(console.error);
  };

  const getCurrentWorkplace = (): Workplace | null =>
    workplaces.find((w) => w.id === currentWorkplaceId) ?? null;

  const getOwnerWorkplaces = (ownerId: string): Workplace[] =>
    workplaces.filter((w) => w.ownerId === ownerId);

  const getStaffWorkplaces = (workplaceIds: string[]): Workplace[] =>
    workplaces.filter((w) => workplaceIds.includes(w.id));

  /** 특정 사업장의 초대 코드를 재발급하고 코드 문자열을 반환 */
  const generateInviteCode = (workplaceId: string): string => {
    const code = randomCode();
    const expiry = makeExpiry();
    setWorkplaces((prev) =>
      prev.map((w) =>
        w.id === workplaceId
          ? { ...w, inviteCode: code, inviteCodeExpiry: expiry }
          : w,
      ),
    );
    return code;
  };

  /** 초대 코드 검증: 존재 여부 + 만료 여부 확인 */
  const joinByInviteCode = (
    code: string,
  ): { success: boolean; workplace?: Workplace; error?: string } => {
    const upper = code.toUpperCase().trim();
    const workplace = workplaces.find((w) => w.inviteCode === upper);

    if (!workplace) {
      return { success: false, error: "유효하지 않은 초대 코드예요." };
    }
    if (new Date(workplace.inviteCodeExpiry) < new Date()) {
      return {
        success: false,
        error: "초대 코드가 만료됐어요. 사장님께 새 코드를 요청해주세요.",
      };
    }
    return { success: true, workplace };
  };

  /** 사장님이 새 사업장 추가 */
  const addWorkplace = (
    name: string,
    address: string,
    ownerId: string,
  ): Workplace => {
    const newWP: Workplace = {
      id: `workplace-${Date.now()}`,
      name,
      address,
      ownerId,
      inviteCode: randomCode(),
      inviteCodeExpiry: makeExpiry(),
      createdAt: new Date()
        .toLocaleDateString("ko-KR")
        .replace(/\. /g, ".")
        .replace(/\.$/, ""),
    };
    setWorkplaces((prev) => [...prev, newWP]);
    return newWP;
  };

  return (
    <WorkplaceContext.Provider
      value={{
        workplaces,
        currentWorkplaceId,
        isLoaded,
        setCurrentWorkplace,
        getCurrentWorkplace,
        getOwnerWorkplaces,
        getStaffWorkplaces,
        generateInviteCode,
        joinByInviteCode,
        addWorkplace,
      }}
    >
      {children}
    </WorkplaceContext.Provider>
  );
}

export function useWorkplace() {
  const context = useContext(WorkplaceContext);
  if (!context) {
    throw new Error("useWorkplace must be used within a WorkplaceProvider");
  }
  return context;
}
