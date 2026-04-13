/**
 * MOARA 급여 계산 단위 테스트
 *
 * Jest + ts-jest 환경에서 실행
 * 실행: npx jest payroll.test.ts
 *
 * 금지사항 확인
 *   - Math.round / Math.ceil 미사용
 *   - 세금 공제 계산 없음
 *   - 모든 금액 세전 기준
 */

import {
  calcDailyPayroll,
  calcNightMinutes,
  calcNetMinutes,
  calcOvertimeMinutes,
  calcWeeklyHolidayPay,
  calcWeeklyPayroll,
  DailyAttendance,
  roundToUnit,
  WorkplacePayrollSettings,
} from "../src/app/utils/payroll";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 공통 설정
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const BASE_SETTINGS: WorkplacePayrollSettings = {
  hourlyRate: 10000,
  payrollUnit: "minute",
  weeklyHolidayPay: true,
  overtimePay: false,
  nightPay: false,
  isUnder5Employees: true,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// roundToUnit
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("roundToUnit", () => {
  test("minute: 그대로 반환", () => {
    expect(roundToUnit(24, "minute")).toBe(24);
  });

  test("10min: 20으로 절사", () => {
    expect(roundToUnit(24, "10min")).toBe(20);
  });

  test("30min: 24분 → 0", () => {
    expect(roundToUnit(24, "30min")).toBe(0);
  });

  test("30min: 45분 → 30", () => {
    expect(roundToUnit(45, "30min")).toBe(30);
  });

  test("10min: 정확히 10의 배수면 그대로", () => {
    expect(roundToUnit(60, "10min")).toBe(60);
  });

  test("30min: 정확히 30의 배수면 그대로", () => {
    expect(roundToUnit(90, "30min")).toBe(90);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// calcNetMinutes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("calcNetMinutes", () => {
  test("09:00~18:00 휴게 60분 → 480분", () => {
    expect(calcNetMinutes("09:00", "18:00", 60)).toBe(480);
  });

  test("자정 넘기는 케이스: 22:00~06:00 휴게 0 → 480분", () => {
    expect(calcNetMinutes("22:00", "06:00", 0)).toBe(480);
  });

  test("휴게시간이 근무보다 길면 0 보장", () => {
    expect(calcNetMinutes("09:00", "09:10", 30)).toBe(0);
  });

  test("당일 0시간 근무 → 0", () => {
    expect(calcNetMinutes("09:00", "09:00", 0)).toBe(0);
  });

  test("정확히 4시간(240분)", () => {
    expect(calcNetMinutes("09:00", "13:30", 30)).toBe(240);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// calcOvertimeMinutes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("calcOvertimeMinutes", () => {
  test("480분 이하 → 0", () => {
    expect(calcOvertimeMinutes(480)).toBe(0);
    expect(calcOvertimeMinutes(240)).toBe(0);
  });

  test("540분 → 60분 초과", () => {
    expect(calcOvertimeMinutes(540)).toBe(60);
  });

  test("600분 → 120분 초과", () => {
    expect(calcOvertimeMinutes(600)).toBe(120);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// calcNightMinutes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("calcNightMinutes", () => {
  test("주간 근무(09:00~18:00)는 야간 없음", () => {
    expect(calcNightMinutes("09:00", "18:00", 60)).toBe(0);
  });

  test("22:00~06:00 전체 야간 근무 → 480분", () => {
    expect(calcNightMinutes("22:00", "06:00", 0)).toBe(480);
  });

  test("23:00~01:00 야간 2시간 → 120분", () => {
    expect(calcNightMinutes("23:00", "01:00", 0)).toBe(120);
  });

  test("05:00~14:00 새벽 1시간(05~06) → 60분", () => {
    expect(calcNightMinutes("05:00", "14:00", 0)).toBe(60);
  });

  test("20:00~02:00 야간 구간: 22:00~02:00 = 240분", () => {
    expect(calcNightMinutes("20:00", "02:00", 0)).toBe(240);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// calcWeeklyHolidayPay
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("calcWeeklyHolidayPay", () => {
  test("주 20시간(1200분) → eligible: true", () => {
    const result = calcWeeklyHolidayPay(1200, BASE_SETTINGS);
    expect(result.eligible).toBe(true);
    expect(result.amount).toBeGreaterThan(0);
  });

  test("주 14시간(840분) → eligible: false (15h 미만)", () => {
    const result = calcWeeklyHolidayPay(840, BASE_SETTINGS);
    expect(result.eligible).toBe(false);
    expect(result.amount).toBe(0);
  });

  test("weeklyHolidayPay: false 설정 시 → eligible: false", () => {
    const settings = { ...BASE_SETTINGS, weeklyHolidayPay: false };
    const result = calcWeeklyHolidayPay(1200, settings);
    expect(result.eligible).toBe(false);
    expect(result.amount).toBe(0);
  });

  test("정확히 15시간(900분) → 주휴수당 발생", () => {
    const result = calcWeeklyHolidayPay(900, BASE_SETTINGS);
    expect(result.eligible).toBe(true);
    // 900 / 2400 × 8 × 10000 = 30,000원
    expect(result.amount).toBe(30000);
  });

  test("주 40시간(2400분) → 8시간분 시급", () => {
    const result = calcWeeklyHolidayPay(2400, BASE_SETTINGS);
    expect(result.eligible).toBe(true);
    // 2400 / 2400 × 8 × 10000 = 80,000원
    expect(result.amount).toBe(80000);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// calcDailyPayroll
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("calcDailyPayroll", () => {
  const attendance = (
    clockIn: string,
    clockOut: string,
    breakMinutes = 0,
    date = "2026-04-01",
  ): DailyAttendance => ({ date, clockIn, clockOut, breakMinutes });

  test("09:00~18:00 휴게 60분 → netMinutes 480, baseWage 80,000", () => {
    const result = calcDailyPayroll(
      attendance("09:00", "18:00", 60),
      BASE_SETTINGS,
    );
    expect(result.netMinutes).toBe(480);
    expect(result.baseWage).toBe(80000);
    expect(result.overtimeWage).toBe(0);
    expect(result.holidayWage).toBe(0);
  });

  test("연장수당 ON: 09:00~20:00 휴게 60분 → overtime 60분, overtimeWage 5,000", () => {
    const settings: WorkplacePayrollSettings = {
      ...BASE_SETTINGS,
      overtimePay: true,
    };
    // netMinutes = 11h - 1h = 10h = 600분
    // overtimeMinutes = 600 - 480 = 120분
    // overtimeWage = 120/60 × 10000 × 0.5 = 10,000원
    const result = calcDailyPayroll(
      attendance("09:00", "20:00", 60),
      settings,
    );
    expect(result.netMinutes).toBe(600);
    expect(result.overtimeMinutes).toBe(120);
    expect(result.overtimeWage).toBe(10000);
  });

  test("야간수당 ON: 22:00~06:00 휴게 0분 → nightMinutes 480, nightWage 40,000", () => {
    const settings: WorkplacePayrollSettings = {
      ...BASE_SETTINGS,
      nightPay: true,
    };
    const result = calcDailyPayroll(
      attendance("22:00", "06:00", 0),
      settings,
    );
    expect(result.netMinutes).toBe(480);
    expect(result.nightMinutes).toBe(480);
    // 480/60 × 10000 × 0.5 = 40,000
    expect(result.nightWage).toBe(40000);
  });

  test("근로자의 날(5/1) 5인 미만 → holidayWage 발생", () => {
    // 8시간 근무: baseWage 80,000 + holidayWage 40,000 = 120,000 (1.5배)
    const result = calcDailyPayroll(
      attendance("09:00", "18:00", 60, "2026-05-01"),
      BASE_SETTINGS,
    );
    expect(result.holidayWage).toBe(40000);
    expect(result.dailyTotal).toBe(120000);
  });

  test("근로자의 날(5/1) 5인 이상 → holidayWage 0", () => {
    const settings: WorkplacePayrollSettings = {
      ...BASE_SETTINGS,
      isUnder5Employees: false,
    };
    const result = calcDailyPayroll(
      attendance("09:00", "18:00", 60, "2026-05-01"),
      settings,
    );
    expect(result.holidayWage).toBe(0);
  });

  test("30min 단위: 45분 근무 → roundedMinutes 30 → baseWage 5,000", () => {
    const settings: WorkplacePayrollSettings = {
      ...BASE_SETTINGS,
      payrollUnit: "30min",
    };
    const result = calcDailyPayroll(
      attendance("09:00", "09:45", 0),
      settings,
    );
    // roundToUnit(45, '30min') = 30
    // 30/60 × 10000 = 5,000
    expect(result.baseWage).toBe(5000);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// calcWeeklyPayroll
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("calcWeeklyPayroll", () => {
  // 월~금 각 8시간(480분) 근무: 총 2400분 (주 40시간)
  const weekAttendances: DailyAttendance[] = [
    { date: "2026-03-30", clockIn: "09:00", clockOut: "18:00", breakMinutes: 60 },
    { date: "2026-03-31", clockIn: "09:00", clockOut: "18:00", breakMinutes: 60 },
    { date: "2026-04-01", clockIn: "09:00", clockOut: "18:00", breakMinutes: 60 },
    { date: "2026-04-02", clockIn: "09:00", clockOut: "18:00", breakMinutes: 60 },
    { date: "2026-04-03", clockIn: "09:00", clockOut: "18:00", breakMinutes: 60 },
  ];

  test("주 40시간 근무 → 주휴수당 발생, weeklyTotal 정상", () => {
    const result = calcWeeklyPayroll(
      weekAttendances,
      BASE_SETTINGS,
      "2026-03-30",
    );
    expect(result.totalNetMinutes).toBe(2400);
    expect(result.isWeeklyHolidayEligible).toBe(true);
    // dailySum = 5 × 80,000 = 400,000
    // weeklyHolidayPay = 2400/2400 × 8 × 10000 = 80,000
    expect(result.weeklyHolidayPay).toBe(80000);
    expect(result.weeklyTotal).toBe(480000);
  });

  test("주 2일 단기 근무(14h 미만) → 주휴수당 없음", () => {
    const shortWeek: DailyAttendance[] = [
      { date: "2026-03-30", clockIn: "09:00", clockOut: "16:00", breakMinutes: 0 },
      { date: "2026-03-31", clockIn: "09:00", clockOut: "16:00", breakMinutes: 0 },
    ];
    const result = calcWeeklyPayroll(shortWeek, BASE_SETTINGS, "2026-03-30");
    expect(result.isWeeklyHolidayEligible).toBe(false);
    expect(result.weeklyHolidayPay).toBe(0);
  });
});
