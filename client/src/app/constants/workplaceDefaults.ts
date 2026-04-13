import { WorkplacePayrollSettings } from "../utils/payroll";
import { CURRENT_MINIMUM_WAGE } from "./minimumWage";

/**
 * 5인 미만 사업장 급여 계산 기본값
 *
 * - 연장근로수당·야간근로수당은 5인 미만 사업장에 법적 의무가 없으므로 기본 OFF
 * - 주휴수당은 5인 미만도 의무이므로 기본 ON
 * - 근로자의 날(5/1) 가산수당은 isUnder5Employees: true 로 활성화
 */
export const DEFAULT_PAYROLL_SETTINGS: WorkplacePayrollSettings = {
  hourlyRate: CURRENT_MINIMUM_WAGE, // 2026년: 10,320원 (minimumWage.ts 연동)
  payrollUnit: "minute",
  weeklyHolidayPay: true,           // 주휴수당 기본 ON (5인 미만도 의무)
  overtimePay: false,               // 연장수당 기본 OFF (5인 미만 비의무)
  nightPay: false,                  // 야간수당 기본 OFF (5인 미만 비의무)
  isUnder5Employees: true,          // 5인 미만 기본값 (근로자의 날 1.5배 적용)
};

/**
 * 5인 이상 사업장 급여 계산 기본값
 *
 * - 연장·야간·주휴 모두 법적 의무이므로 기본 ON
 */
export const DEFAULT_PAYROLL_SETTINGS_5PLUS: WorkplacePayrollSettings = {
  hourlyRate: CURRENT_MINIMUM_WAGE,
  payrollUnit: "minute",
  weeklyHolidayPay: true,
  overtimePay: true,                // 연장수당 기본 ON (5인 이상 의무)
  nightPay: true,                   // 야간수당 기본 ON (5인 이상 의무)
  isUnder5Employees: false,
};

/** AsyncStorage 키 */
export const PAYROLL_SETTINGS_STORAGE_KEY = "@moara:payrollSettings";
