// ─────────────────────────────────────────────────────────────────
// MOARA 급여 계산 유틸리티
//
// 주의사항
//  - Math.floor 외 반올림 함수(Math.round, Math.ceil) 사용 금지
//  - 세금 공제 계산 금지 (소득세·고용보험·국민연금 등)
//  - 모든 금액은 세전(稅前) 기준
// ─────────────────────────────────────────────────────────────────

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 타입 정의
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type PayrollUnit = "minute" | "10min" | "30min";

/** 사업장별 급여 계산 설정 */
export interface WorkplacePayrollSettings {
  hourlyRate: number;          // 시급 (원)
  payrollUnit: PayrollUnit;    // 급여 계산 단위
  weeklyHolidayPay: boolean;   // 주휴수당 사용 여부 (5인 미만도 의무)
  overtimePay: boolean;        // 연장근로수당 여부 (기본 false, 5인 이상 의무)
  nightPay: boolean;           // 야간근로수당 여부 (기본 false, 5인 이상 의무)
  isUnder5Employees: boolean;  // 5인 미만 사업장 여부 (근로자의 날 가산수당 기준)
}

/** 일별 근태 기록 */
export interface DailyAttendance {
  date: string;        // 'YYYY-MM-DD'
  clockIn: string;     // 'HH:mm'
  clockOut: string;    // 'HH:mm'
  breakMinutes: number;
}

/** 일별 급여 내역 */
export interface DailyPayroll {
  date: string;
  netMinutes: number;       // 실 근무시간 (분)
  baseWage: number;         // 기본급 (세전, 원)
  overtimeMinutes: number;  // 연장근로 (분)
  overtimeWage: number;     // 연장근로수당 (원)
  nightMinutes: number;     // 야간근로 (분)
  nightWage: number;        // 야간근로수당 (원)
  holidayWage: number;      // 근로자의 날 가산수당 (원) — 해당일만 > 0
  dailyTotal: number;       // 일 합계 (원, 세전)
}

/** 주간 급여 내역 */
export interface WeeklyPayroll {
  weekStart: string;                   // 주 시작일 'YYYY-MM-DD'
  totalNetMinutes: number;             // 주간 총 실 근무시간 (분)
  isWeeklyHolidayEligible: boolean;    // 주휴수당 지급 대상 여부
  weeklyHolidayPay: number;            // 주휴수당 (원, 세전)
  dailyPayrolls: DailyPayroll[];
  weeklyTotal: number;                 // 주 합계 (원, 세전)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 내부 유틸
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** 'HH:mm' → 분(0~1439) */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * 근로자의 날(5월 1일) 여부
 * date: 'YYYY-MM-DD'
 */
function isLaborDay(date: string): boolean {
  const d = new Date(date + "T00:00:00");
  return d.getMonth() === 4 && d.getDate() === 1; // 0-indexed: May = 4
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 함수 1: 계산 단위 적용
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 급여 계산 단위에 따라 분을 절사(Math.floor)한다.
 *
 * minute  → 그대로
 * 10min   → 10분 단위 절사  (예: 24 → 20)
 * 30min   → 30분 단위 절사  (예: 45 → 30)
 */
export function roundToUnit(minutes: number, unit: PayrollUnit): number {
  if (unit === "minute") return minutes;
  if (unit === "10min") return Math.floor(minutes / 10) * 10;
  if (unit === "30min") return Math.floor(minutes / 30) * 30;
  return minutes;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 함수 2: 일별 실 근무시간 계산
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * clockIn~clockOut 사이의 실 근무시간(분)을 반환한다.
 *
 * - 자정 넘기는 야간 근무 처리 (clockOut < clockIn → +24h)
 * - 실 근무시간 = 총 근무시간 − 휴게시간
 * - 최솟값 0 보장
 */
export function calcNetMinutes(
  clockIn: string,
  clockOut: string,
  breakMinutes: number,
): number {
  const inMins = timeToMinutes(clockIn);
  let outMins = timeToMinutes(clockOut);
  if (outMins < inMins) outMins += 1440; // 자정 넘기는 케이스
  return Math.max(0, Math.floor(outMins - inMins - breakMinutes));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 함수 3: 연장근로 계산 (일 8시간 초과분)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 일 8시간(480분) 초과 근무분을 반환한다.
 * 5인 이상 사업장에서 overtimePay: true일 때 적용.
 */
export function calcOvertimeMinutes(netMinutes: number): number {
  return Math.max(0, netMinutes - 480);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 함수 4: 야간근로 계산 (22:00 ~ 06:00)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 22:00~06:00 구간과 실제 근무 구간의 교집합(분)을 반환한다.
 *
 * 야간 구간을 3개 영역으로 분리해 검사:
 *   [0, 360]     → 당일 00:00~06:00
 *   [1320, 1440] → 당일 22:00~24:00
 *   [1440, 1800] → 익일 00:00~06:00 (자정 넘기는 케이스)
 *
 * 실 근무시간(netMinutes)을 상한으로 사용해 과산입을 방지한다.
 */
export function calcNightMinutes(
  clockIn: string,
  clockOut: string,
  breakMinutes: number,
): number {
  const inMins = timeToMinutes(clockIn);
  let outMins = timeToMinutes(clockOut);
  if (outMins < inMins) outMins += 1440;

  const NET_MINS = Math.max(0, outMins - inMins - breakMinutes);

  const NIGHT_ZONES: [number, number][] = [
    [0, 360],     // 00:00 ~ 06:00 (당일 새벽)
    [1320, 1440], // 22:00 ~ 24:00 (당일 야간)
    [1440, 1800], // 24:00 ~ 30:00 = 익일 00:00 ~ 06:00
  ];

  let nightMins = 0;
  for (const [start, end] of NIGHT_ZONES) {
    const overlapStart = Math.max(inMins, start);
    const overlapEnd = Math.min(outMins, end);
    if (overlapEnd > overlapStart) {
      nightMins += overlapEnd - overlapStart;
    }
  }

  // 실 근무시간 초과 방지
  return Math.max(0, Math.floor(Math.min(nightMins, NET_MINS)));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 함수 5: 일별 급여 계산
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 하루치 근태 기록과 사업장 급여 설정을 받아 DailyPayroll을 반환한다.
 *
 * 수당 구조 (세전):
 *   baseWage      = roundToUnit(netMinutes) / 60 × hourlyRate
 *   overtimeWage  = overtimeMins / 60 × hourlyRate × 0.5  (기본 1배는 baseWage에 포함)
 *   nightWage     = nightMins    / 60 × hourlyRate × 0.5
 *   holidayWage   = 근로자의 날(5/1), isUnder5Employees 시 추가 0.5배
 */
export function calcDailyPayroll(
  attendance: DailyAttendance,
  settings: WorkplacePayrollSettings,
): DailyPayroll {
  const { date, clockIn, clockOut, breakMinutes } = attendance;
  const { hourlyRate, payrollUnit, overtimePay, nightPay, isUnder5Employees } = settings;

  // 1. 실 근무시간
  const netMinutes = calcNetMinutes(clockIn, clockOut, breakMinutes);

  // 2. 계산 단위 적용
  const roundedMinutes = roundToUnit(netMinutes, payrollUnit);

  // 3. 기본급
  const baseWage = Math.floor((roundedMinutes / 60) * hourlyRate);

  // 4. 연장근로수당 (일 8시간 초과 0.5배 가산, 5인 이상에서 주로 사용)
  const overtimeMinutes = overtimePay ? calcOvertimeMinutes(netMinutes) : 0;
  const overtimeWage = overtimePay
    ? Math.floor((overtimeMinutes / 60) * hourlyRate * 0.5)
    : 0;

  // 5. 야간근로수당 (22:00~06:00 구간 0.5배 가산)
  const nightMinutes = nightPay
    ? calcNightMinutes(clockIn, clockOut, breakMinutes)
    : 0;
  const nightWage = nightPay
    ? Math.floor((nightMinutes / 60) * hourlyRate * 0.5)
    : 0;

  // 6. 근로자의 날 가산수당 (5월 1일, 5인 미만 사업장)
  //    총 지급 = 1.0배(baseWage) + 0.5배(holidayWage) = 1.5배
  const holidayWage =
    isLaborDay(date) && isUnder5Employees
      ? Math.floor((roundedMinutes / 60) * hourlyRate * 0.5)
      : 0;

  // 7. 일 합계 (세전)
  const dailyTotal = baseWage + overtimeWage + nightWage + holidayWage;

  return {
    date,
    netMinutes,
    baseWage,
    overtimeMinutes,
    overtimeWage,
    nightMinutes,
    nightWage,
    holidayWage,
    dailyTotal,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 함수 6: 주휴수당 계산
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 주휴수당 지급 조건:
 *   - settings.weeklyHolidayPay === true
 *   - 주간 실 근무시간 ≥ 15시간(900분)
 *
 * 주휴수당 = (주간실근무시간 / 40시간) × 8시간 × 시급
 *          = weeklyNetMinutes / 2400 × 8 × hourlyRate
 */
export function calcWeeklyHolidayPay(
  weeklyNetMinutes: number,
  settings: WorkplacePayrollSettings,
): { eligible: boolean; amount: number } {
  if (!settings.weeklyHolidayPay || weeklyNetMinutes < 900) {
    return { eligible: false, amount: 0 };
  }
  const amount = Math.floor(
    (weeklyNetMinutes / 2400) * 8 * settings.hourlyRate,
  );
  return { eligible: true, amount };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 함수 7: 주간 급여 계산
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 해당 주 출근 기록 전체(최대 6일)를 받아 WeeklyPayroll을 반환한다.
 */
export function calcWeeklyPayroll(
  attendances: DailyAttendance[],
  settings: WorkplacePayrollSettings,
  weekStart: string,
): WeeklyPayroll {
  // 1. 일별 급여 계산
  const dailyPayrolls = attendances.map((a) => calcDailyPayroll(a, settings));

  // 2. 주간 총 실 근무시간
  const totalNetMinutes = dailyPayrolls.reduce(
    (sum, d) => sum + d.netMinutes,
    0,
  );

  // 3. 주휴수당
  const { eligible, amount: weeklyHolidayPay } = calcWeeklyHolidayPay(
    totalNetMinutes,
    settings,
  );

  // 4. 주 합계 (일별 합계 + 주휴수당)
  const dailySum = dailyPayrolls.reduce((sum, d) => sum + d.dailyTotal, 0);
  const weeklyTotal = dailySum + weeklyHolidayPay;

  return {
    weekStart,
    totalNetMinutes,
    isWeeklyHolidayEligible: eligible,
    weeklyHolidayPay,
    dailyPayrolls,
    weeklyTotal,
  };
}
