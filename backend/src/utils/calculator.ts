// 급여 계산 로직

export interface PayrollInput {
  baseSalary: number;
  workingHours: number;
  overtimeHours: number;
  nightShiftHours: number;
  holidayHours: number;
}

export interface PayrollResult {
  baseSalary: number;
  overtimePay: number;
  nightShiftPay: number;
  holidayPay: number;
  totalPay: number;
  deductions: {
    incomeTax: number;
    nationalPension: number;
    healthInsurance: number;
    employmentInsurance: number;
    total: number;
  };
  netPay: number;
}

// 기본 시급 계산 (월급을 시간으로 환산)
export const calculateHourlyRate = (monthlySalary: number): number => {
  // 월 209시간 기준 (주 40시간 × 4.345주)
  return Math.round(monthlySalary / 209);
};

// 연장 근무 수당 (1.5배)
export const calculateOvertimePay = (hourlyRate: number, hours: number): number => {
  return Math.round(hourlyRate * 1.5 * hours);
};

// 야간 근무 수당 (1.5배, 22:00~06:00)
export const calculateNightShiftPay = (hourlyRate: number, hours: number): number => {
  return Math.round(hourlyRate * 1.5 * hours);
};

// 휴일 근무 수당 (2배)
export const calculateHolidayPay = (hourlyRate: number, hours: number): number => {
  return Math.round(hourlyRate * 2 * hours);
};

// 공제금 계산
export const calculateDeductions = (totalPay: number): PayrollResult['deductions'] => {
  const nationalPension = Math.round(totalPay * 0.045); // 국민연금 4.5%
  const healthInsurance = Math.round(totalPay * 0.03545); // 건강보험 3.545%
  const employmentInsurance = Math.round(totalPay * 0.009); // 고용보험 0.9%
  
  // 소득세 (간이세율표 기준 대략적인 계산)
  let incomeTax = 0;
  if (totalPay <= 3000000) {
    incomeTax = Math.round(totalPay * 0.05);
  } else if (totalPay <= 4500000) {
    incomeTax = Math.round(totalPay * 0.08);
  } else {
    incomeTax = Math.round(totalPay * 0.1);
  }

  const total = nationalPension + healthInsurance + employmentInsurance + incomeTax;

  return {
    incomeTax,
    nationalPension,
    healthInsurance,
    employmentInsurance,
    total,
  };
};

// 전체 급여 계산
export const calculatePayroll = (input: PayrollInput): PayrollResult => {
  const hourlyRate = calculateHourlyRate(input.baseSalary);

  const overtimePay = calculateOvertimePay(hourlyRate, input.overtimeHours);
  const nightShiftPay = calculateNightShiftPay(hourlyRate, input.nightShiftHours);
  const holidayPay = calculateHolidayPay(hourlyRate, input.holidayHours);

  const totalPay = input.baseSalary + overtimePay + nightShiftPay + holidayPay;

  const deductions = calculateDeductions(totalPay);
  const netPay = totalPay - deductions.total;

  return {
    baseSalary: input.baseSalary,
    overtimePay,
    nightShiftPay,
    holidayPay,
    totalPay,
    deductions,
    netPay,
  };
};
