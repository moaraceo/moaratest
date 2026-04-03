// 숫자 포맷 통일 (924000 → "924,000원")
export const formatMoney = (amount: number): string => {
  return amount.toLocaleString('ko-KR') + '원';
};

// 숫자만 포맷 (924000 → "924,000")
export const formatNumber = (amount: number): string => {
  return amount.toLocaleString('ko-KR');
};

// 분 → 시간 포맷 (543 → "9h 03m")
export const formatMinutes = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
};

// 월 포맷 (2025, 3 → "2025.03")
export const formatMonth = (year: number, month: number): string => {
  return `${year}.${String(month).padStart(2, '0')}`;
};
