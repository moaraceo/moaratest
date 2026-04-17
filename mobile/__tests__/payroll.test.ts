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
  calcMonthlyPayroll,
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 버그 회귀 테스트: roundedMinutes vs netMinutes 불일치
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("[회귀] 계산 단위 절사와 연장근로 기준 일치", () => {
  const overtimeSettings: WorkplacePayrollSettings = {
    ...BASE_SETTINGS,
    overtimePay: true,
    payrollUnit: "10min",
  };

  test("10분 절사: netMinutes=485 → roundedMinutes=480 → overtimeMinutes=0 (연장 없음)", () => {
    // 09:00~17:05 (순 근무 485분) — 절사 후 480분, 연장 없어야 함
    const result = calcDailyPayroll(
      { date: "2026-04-01", clockIn: "09:00", clockOut: "17:05", breakMinutes: 0 },
      overtimeSettings,
    );
    expect(result.netMinutes).toBe(485);
    expect(result.baseWage).toBe(Math.floor(480 / 60 * 10000)); // 80,000
    expect(result.overtimeMinutes).toBe(0);
    expect(result.overtimeWage).toBe(0);
  });

  test("10분 절사: netMinutes=510 → roundedMinutes=510 → overtimeMinutes=30 (연장 정상)", () => {
    // 09:00~17:30 (순 근무 510분) — 절사 후 510분, 연장 30분
    const result = calcDailyPayroll(
      { date: "2026-04-01", clockIn: "09:00", clockOut: "17:30", breakMinutes: 0 },
      overtimeSettings,
    );
    expect(result.netMinutes).toBe(510);
    expect(result.overtimeMinutes).toBe(30);
    expect(result.overtimeWage).toBe(Math.floor(30 / 60 * 10000 * 0.5)); // 2,500
  });

  test("30분 절사: netMinutes=507 → roundedMinutes=480 → overtimeMinutes=0 (연장 없음)", () => {
    const settings30: WorkplacePayrollSettings = {
      ...BASE_SETTINGS,
      overtimePay: true,
      payrollUnit: "30min",
    };
    const result = calcDailyPayroll(
      { date: "2026-04-01", clockIn: "09:00", clockOut: "17:27", breakMinutes: 0 },
      settings30,
    );
    // netMinutes=507, roundToUnit(507,"30min")=480
    expect(result.overtimeMinutes).toBe(0);
    expect(result.overtimeWage).toBe(0);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 버그 회귀 테스트: 주휴수당 상한 (주 40시간)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("[회귀] 주휴수당 40시간 상한", () => {
  test("주 40시간(2400분) → 80,000원 (상한값)", () => {
    const result = calcWeeklyHolidayPay(2400, BASE_SETTINGS);
    expect(result.amount).toBe(80000);
  });

  test("주 50시간(3000분) → 상한 초과하지 않음, 여전히 80,000원", () => {
    const result = calcWeeklyHolidayPay(3000, BASE_SETTINGS);
    expect(result.eligible).toBe(true);
    expect(result.amount).toBe(80000); // 상한 2400분 기준
  });

  test("주 60시간(3600분) → 여전히 80,000원", () => {
    const result = calcWeeklyHolidayPay(3600, BASE_SETTINGS);
    expect(result.amount).toBe(80000);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 경계값 테스트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("경계값", () => {
  test("clockIn == clockOut → netMinutes 0, baseWage 0", () => {
    const result = calcDailyPayroll(
      { date: "2026-04-01", clockIn: "09:00", clockOut: "09:00", breakMinutes: 0 },
      BASE_SETTINGS,
    );
    expect(result.netMinutes).toBe(0);
    expect(result.baseWage).toBe(0);
    expect(result.dailyTotal).toBe(0);
  });

  test("주 15시간 정확히(900분) → 주휴수당 발생 (경계 포함)", () => {
    const result = calcWeeklyHolidayPay(900, BASE_SETTINGS);
    expect(result.eligible).toBe(true);
    // 900/2400 × 8 × 10000 = 30,000
    expect(result.amount).toBe(30000);
  });

  test("주 899분 → 주휴수당 미발생 (경계 미달)", () => {
    const result = calcWeeklyHolidayPay(899, BASE_SETTINGS);
    expect(result.eligible).toBe(false);
    expect(result.amount).toBe(0);
  });

  test("자정 출근 (00:00~08:00) → 야간 6시간", () => {
    // 00:00~06:00 야간 360분
    expect(calcNightMinutes("00:00", "08:00", 0)).toBe(360);
  });

  test("roundToUnit: 0분 → 0", () => {
    expect(roundToUnit(0, "10min")).toBe(0);
    expect(roundToUnit(0, "30min")).toBe(0);
    expect(roundToUnit(0, "minute")).toBe(0);
  });

  test("연장+야간 복합: 22:00~07:00 10분 절사, 연장+야간 모두 ON", () => {
    const settings: WorkplacePayrollSettings = {
      ...BASE_SETTINGS,
      overtimePay: true,
      nightPay: true,
      payrollUnit: "10min",
    };
    // netMinutes = 540분 (9h), roundedMinutes = 540
    // overtimeMinutes = 540 - 480 = 60분
    // nightMinutes = 22:00~07:00 중 야간(22~06) = 480분
    const result = calcDailyPayroll(
      { date: "2026-04-01", clockIn: "22:00", clockOut: "07:00", breakMinutes: 0 },
      settings,
    );
    expect(result.netMinutes).toBe(540);
    expect(result.overtimeMinutes).toBe(60);
    expect(result.overtimeWage).toBe(Math.floor(60 / 60 * 10000 * 0.5)); // 5,000
    expect(result.nightMinutes).toBe(480);
    expect(result.nightWage).toBe(Math.floor(480 / 60 * 10000 * 0.5)); // 40,000
    // dailyTotal = baseWage(90,000) + overtimeWage(5,000) + nightWage(40,000)
    expect(result.dailyTotal).toBe(
      Math.floor(540 / 60 * 10000) + 5000 + 40000
    );
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// calcMonthlyPayroll
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("calcMonthlyPayroll", () => {
  // 4월: 월~금 각 8시간 × 4주 = 20일 근무
  const aprilAttendances: DailyAttendance[] = [
    // 1주차 (3/30~4/3)
    { date: "2026-03-30", clockIn: "09:00", clockOut: "18:00", breakMinutes: 60 },
    { date: "2026-03-31", clockIn: "09:00", clockOut: "18:00", breakMinutes: 60 },
    { date: "2026-04-01", clockIn: "09:00", clockOut: "18:00", breakMinutes: 60 },
    { date: "2026-04-02", clockIn: "09:00", clockOut: "18:00", breakMinutes: 60 },
    { date: "2026-04-03", clockIn: "09:00", clockOut: "18:00", breakMinutes: 60 },
    // 2주차 (4/6~4/10)
    { date: "2026-04-06", clockIn: "09:00", clockOut: "18:00", breakMinutes: 60 },
    { date: "2026-04-07", clockIn: "09:00", clockOut: "18:00", breakMinutes: 60 },
    { date: "2026-04-08", clockIn: "09:00", clockOut: "18:00", breakMinutes: 60 },
    { date: "2026-04-09", clockIn: "09:00", clockOut: "18:00", breakMinutes: 60 },
    { date: "2026-04-10", clockIn: "09:00", clockOut: "18:00", breakMinutes: 60 },
  ];

  test("주별 그루핑 정확성 — 2주로 나뉨", () => {
    const result = calcMonthlyPayroll(aprilAttendances, BASE_SETTINGS, "2026-04");
    expect(result.weeklyPayrolls).toHaveLength(2);
  });

  test("grandTotal = 주별 합계의 합", () => {
    const result = calcMonthlyPayroll(aprilAttendances, BASE_SETTINGS, "2026-04");
    const manualTotal = result.weeklyPayrolls.reduce((s, w) => s + w.weeklyTotal, 0);
    expect(result.grandTotal).toBe(manualTotal);
  });

  test("항목별 합계 일치성", () => {
    const result = calcMonthlyPayroll(aprilAttendances, BASE_SETTINGS, "2026-04");
    const manualBase = result.weeklyPayrolls.flatMap(w => w.dailyPayrolls).reduce((s, d) => s + d.baseWage, 0);
    expect(result.totalBaseWage).toBe(manualBase);
  });

  test("빈 근태 목록 → 모두 0", () => {
    const result = calcMonthlyPayroll([], BASE_SETTINGS, "2026-04");
    expect(result.grandTotal).toBe(0);
    expect(result.totalNetMinutes).toBe(0);
    expect(result.weeklyPayrolls).toHaveLength(0);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// [검증] 5인 미만 사업장 — 사장이 믿고 맡길 수 있는가
// 시급: 11,000원
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe("[5인 미만 사업장] 야간/연장 미발생 + 근로자의 날 + 주휴 검증", () => {
  const UNDER5_SETTINGS: WorkplacePayrollSettings = {
    hourlyRate: 11000,
    payrollUnit: "30min",
    weeklyHolidayPay: true,
    overtimePay: false,   // 5인 미만: 연장수당 없음
    nightPay: false,      // 5인 미만: 야간수당 없음
    isUnder5Employees: true,
  };

  // ── 야간 근무해도 야간수당 0 ──────────────────────
  test("FAIL 방지: 야간 근무(22:00~06:00)해도 nightWage = 0 (nightPay OFF)", () => {
    const result = calcDailyPayroll(
      { date: "2026-04-01", clockIn: "22:00", clockOut: "06:00", breakMinutes: 0 },
      UNDER5_SETTINGS,
    );
    // netMinutes = 480, roundedMinutes = 480 (30min 단위 정확히 나눔)
    expect(result.netMinutes).toBe(480);
    expect(result.nightMinutes).toBe(0);   // nightPay: false → 계산 안 함
    expect(result.nightWage).toBe(0);      // FAIL → 야간수당 발생하면 오류
    // baseWage = 480/60 × 11000 = 88,000
    expect(result.baseWage).toBe(88000);
    expect(result.dailyTotal).toBe(88000);
  });

  // ── 8시간 초과해도 연장수당 0 ─────────────────────
  test("FAIL 방지: 10시간 근무해도 overtimeWage = 0 (overtimePay OFF)", () => {
    // 09:00~20:00 휴게 60분 → 순 근무 600분
    // roundToUnit(600, '30min') = 600 (정확히 30배수)
    const result = calcDailyPayroll(
      { date: "2026-04-01", clockIn: "09:00", clockOut: "20:00", breakMinutes: 60 },
      UNDER5_SETTINGS,
    );
    expect(result.netMinutes).toBe(600);
    expect(result.overtimeMinutes).toBe(0);  // overtimePay: false → 계산 안 함
    expect(result.overtimeWage).toBe(0);     // FAIL → 연장수당 발생하면 오류
    // baseWage = 600/60 × 11000 = 110,000
    expect(result.baseWage).toBe(110000);
    expect(result.dailyTotal).toBe(110000);
  });

  // ── 5인 미만 + overtimePay:true 명시하면 연장수당 발생해야 함 ──
  test("overtimePay: true 명시 시 연장수당 정상 발생", () => {
    const settings5Over = { ...UNDER5_SETTINGS, overtimePay: true };
    const result = calcDailyPayroll(
      { date: "2026-04-01", clockIn: "09:00", clockOut: "20:00", breakMinutes: 60 },
      settings5Over,
    );
    // netMinutes=600, roundedMinutes=600, overtimeMinutes=600-480=120
    expect(result.overtimeMinutes).toBe(120);
    // overtimeWage = 120/60 × 11000 × 0.5 = 11,000
    expect(result.overtimeWage).toBe(11000);
  });

  // ── 근로자의 날(5/1) 5인 미만 → 1.5배 ───────────────
  test("근로자의 날(5/1) 8시간 → baseWage + holidayWage = 1.5배", () => {
    // 09:00~18:00 휴게 60분 → 순 480분
    const result = calcDailyPayroll(
      { date: "2026-05-01", clockIn: "09:00", clockOut: "18:00", breakMinutes: 60 },
      UNDER5_SETTINGS,
    );
    // baseWage = 480/60 × 11000 = 88,000
    // holidayWage = 480/60 × 11000 × 0.5 = 44,000
    expect(result.baseWage).toBe(88000);
    expect(result.holidayWage).toBe(44000);
    expect(result.dailyTotal).toBe(132000); // 88,000 + 44,000
    expect(result.overtimeWage).toBe(0);   // 연장 OFF이므로 0
    expect(result.nightWage).toBe(0);      // 야간 OFF이므로 0
  });

  // ── 케이스 1: 월화수 4h + 화목 5h ────────────────────
  test("케이스1: 월4h 화5h 수4h 목5h → 주휴수당 포함 주 합계", () => {
    // 화요일은 두 조건 겹침 → 5h (최대)
    const week: DailyAttendance[] = [
      { date: "2026-04-13", clockIn: "09:00", clockOut: "13:00", breakMinutes: 0 }, // 월 240분
      { date: "2026-04-14", clockIn: "09:00", clockOut: "14:00", breakMinutes: 0 }, // 화 300분
      { date: "2026-04-15", clockIn: "09:00", clockOut: "13:00", breakMinutes: 0 }, // 수 240분
      { date: "2026-04-17", clockIn: "09:00", clockOut: "14:00", breakMinutes: 0 }, // 목 300분
    ];
    const result = calcWeeklyPayroll(week, UNDER5_SETTINGS, "2026-04-13");

    // 총 순 근무시간: 240+300+240+300 = 1080분 (18h) ≥ 900분 → 주휴 발생
    expect(result.totalNetMinutes).toBe(1080);
    expect(result.isWeeklyHolidayEligible).toBe(true);

    // 기본급 합계 (30min 단위, 모두 정확히 30배수)
    // 월: floor(240/60×11000)=44,000 화: floor(300/60×11000)=55,000 수: 44,000 목: 55,000
    const expectedDailySum = 44000 + 55000 + 44000 + 55000; // 198,000
    expect(result.dailyPayrolls.reduce((s, d) => s + d.baseWage, 0)).toBe(expectedDailySum);

    // 주휴수당: floor(1080/2400 × 8 × 11000) = floor(39,600) = 39,600
    expect(result.weeklyHolidayPay).toBe(39600);
    expect(result.weeklyTotal).toBe(198000 + 39600); // 237,600
  });

  // ── 케이스 2: 5월 1일 근무 ────────────────────────────
  test("케이스2: 5월 1일(근로자의 날) 8h 근무 → 1.5배 = 132,000원", () => {
    const result = calcDailyPayroll(
      { date: "2026-05-01", clockIn: "09:00", clockOut: "18:00", breakMinutes: 60 },
      UNDER5_SETTINGS,
    );
    // 순 480분, 30min 단위 480분 그대로
    // baseWage = 88,000, holidayWage = 44,000
    expect(result.dailyTotal).toBe(132000);
  });

  // ── 케이스 3: 주 15시간 이상 주휴수당 ────────────────
  test("케이스3: 주 정확히 900분(15h) → 주휴 33,000원", () => {
    const result = calcWeeklyHolidayPay(900, UNDER5_SETTINGS);
    expect(result.eligible).toBe(true);
    // floor(900/2400 × 8 × 11000) = floor(33,000) = 33,000
    expect(result.amount).toBe(33000);
  });

  test("케이스3: 주 899분(14h59m) → 주휴 미발생", () => {
    const result = calcWeeklyHolidayPay(899, UNDER5_SETTINGS);
    expect(result.eligible).toBe(false);
    expect(result.amount).toBe(0);
  });

  test("케이스3: 주 40h(2400분) 상한 → 주휴 88,000원", () => {
    const result = calcWeeklyHolidayPay(2400, UNDER5_SETTINGS);
    // floor(2400/2400 × 8 × 11000) = 88,000
    expect(result.amount).toBe(88000);
  });

  // ── Math.floor 손실 누적 검증 ─────────────────────────
  test("Math.floor 손실: 29분 근무(30min 절사) → baseWage 0원 (직원 불리, 의도된 정책)", () => {
    const result = calcDailyPayroll(
      { date: "2026-04-01", clockIn: "09:00", clockOut: "09:29", breakMinutes: 0 },
      UNDER5_SETTINGS,
    );
    // netMinutes=29, roundToUnit(29, '30min')=0
    expect(result.netMinutes).toBe(29);
    expect(result.baseWage).toBe(0); // 30분 미만 절사
    expect(result.dailyTotal).toBe(0);
  });

  test("Math.floor: 정확히 30분(1단위) → 5,500원", () => {
    const result = calcDailyPayroll(
      { date: "2026-04-01", clockIn: "09:00", clockOut: "09:30", breakMinutes: 0 },
      UNDER5_SETTINGS,
    );
    // roundToUnit(30, '30min') = 30
    // floor(30/60 × 11000) = floor(5,500) = 5,500
    expect(result.baseWage).toBe(5500);
  });
});
