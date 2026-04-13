/**
 * MOARA 최저시급 관리 파일
 *
 * 매년 1월 최저시급 변경 시 업데이트 방법:
 * 1. MINIMUM_WAGE_TABLE에 새 연도와 시급 추가
 *    예) 2027: 10600,
 *
 * 2. 파일 저장 시 앱 전체에 자동 반영됨
 *    (getCurrentMinimumWage()가 현재 연도 기준으로 자동 계산)
 *
 * 3. 백엔드 연결 후에는 DB에서 관리 가능
 *    (현재는 프론트엔드에서 관리)
 *
 * 연도별 최저시급 이력:
 * 2023년: 9,620원
 * 2024년: 9,860원
 * 2025년: 10,030원
 * 2026년: 10,320원  ← 현재
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// 직원별 시급 저장 키
const WAGE_STORAGE_KEY = "moara_custom_wages";

// 직원별 맞춤 시급 타입
export interface CustomWage {
  staffId: string;
  customWage: number;
  updatedAt: string;
}

// 연도별 최저시급 테이블
export const MINIMUM_WAGE_TABLE: Record<number, number> = {
  2023: 9620,
  2024: 9860,
  2025: 10030,
  2026: 10320, // 현재 적용 시급
};

// 현재 연도 최저시급 자동 반환
export const getCurrentMinimumWage = (): number => {
  const currentYear = new Date().getFullYear();
  // 현재 연도 시급이 없으면 가장 최근 연도 시급 반환
  return (
    MINIMUM_WAGE_TABLE[currentYear] ??
    MINIMUM_WAGE_TABLE[Math.max(...Object.keys(MINIMUM_WAGE_TABLE).map(Number))]
  );
};

// 특정 연도 최저시급 반환
export const getMinimumWageByYear = (year: number): number => {
  return (
    MINIMUM_WAGE_TABLE[year] ??
    MINIMUM_WAGE_TABLE[Math.max(...Object.keys(MINIMUM_WAGE_TABLE).map(Number))]
  );
};

// 현재 최저시급 (바로 쓸 수 있게)
export const CURRENT_MINIMUM_WAGE = getCurrentMinimumWage();

// 직원별 맞춤 시급 저장
export const saveCustomWage = async (
  staffId: string,
  customWage: number,
): Promise<void> => {
  try {
    const saved = await AsyncStorage.getItem(WAGE_STORAGE_KEY);
    const customWages: CustomWage[] = saved ? JSON.parse(saved) : [];

    // 기존 데이터가 있으면 업데이트, 없으면 추가
    const existingIndex = customWages.findIndex((w) => w.staffId === staffId);
    const newWage: CustomWage = {
      staffId,
      customWage,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      customWages[existingIndex] = newWage;
    } else {
      customWages.push(newWage);
    }

    await AsyncStorage.setItem(WAGE_STORAGE_KEY, JSON.stringify(customWages));
  } catch (error) {
    console.error("맞춤 시급 저장 실패:", error);
    throw error;
  }
};

// 직원별 맞춤 시급 불러오기
export const getCustomWage = async (
  staffId: string,
): Promise<number | null> => {
  try {
    const saved = await AsyncStorage.getItem(WAGE_STORAGE_KEY);
    const customWages: CustomWage[] = saved ? JSON.parse(saved) : [];

    const wageData = customWages.find((w) => w.staffId === staffId);
    return wageData ? wageData.customWage : null;
  } catch (error) {
    console.error("맞춤 시급 불러오기 실패:", error);
    return null;
  }
};

// 모든 맞춤 시급 불러오기
export const getAllCustomWages = async (): Promise<CustomWage[]> => {
  try {
    const saved = await AsyncStorage.getItem(WAGE_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("모든 맞춤 시급 불러오기 실패:", error);
    return [];
  }
};

// 직원별 맞춤 시급 삭제
export const removeCustomWage = async (staffId: string): Promise<void> => {
  try {
    const saved = await AsyncStorage.getItem(WAGE_STORAGE_KEY);
    const customWages: CustomWage[] = saved ? JSON.parse(saved) : [];

    const filteredWages = customWages.filter((w) => w.staffId !== staffId);
    await AsyncStorage.setItem(WAGE_STORAGE_KEY, JSON.stringify(filteredWages));
  } catch (error) {
    console.error("맞춤 시급 삭제 실패:", error);
    throw error;
  }
};
