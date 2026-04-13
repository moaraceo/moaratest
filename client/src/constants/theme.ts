export const colors = {
  // 배경
  bg: "#EEF2F8", // 전체 배경 (연한 블루-그레이)
  surface: "#FFFFFF", // 카드 배경 (흰색)
  surface2: "#EBF2FF", // 보조 배경 (연한 파란 회색)

  // 테두리
  border: "#E2E8F0", // 기본 테두리
  border2: "#CBD5E1", // 강조 테두리

  // 포인트 컬러
  primary: "#3F7FF5", // 메인 파란색 (더 선명한 블루)
  primaryDim: "#EBF2FF", // 연한 파란 배경
  success: "#16A34A", // 초록
  successDim: "#F0FDF4", // 연한 초록 배경
  danger: "#DC2626", // 빨강
  dangerDim: "#FEF2F2", // 연한 빨강 배경
  warn: "#D97706", // 주황
  warnDim: "#FFFBEB", // 연한 주황 배경

  // 텍스트
  text: "#1A2540", // 기본 텍스트 (짙은 남색)
  text2: "#64748B", // 보조 텍스트 (회색)
  text3: "#94A3B8", // 희미한 텍스트 (연한 회색)

  // 그림자
  shadow: "rgba(0, 0, 0, 0.06)",
};

export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  button: {
    shadowColor: "#3F7FF5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const typography = {
  h1: {
    fontSize: 24,
    fontWeight: "bold" as const,
    color: colors.text,
    lineHeight: 32,
  },
  h2: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: colors.text,
    lineHeight: 28,
  },
  h3: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: colors.text,
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
    color: colors.text,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: "400" as const,
    color: colors.text2,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: "400" as const,
    color: colors.text2,
    lineHeight: 16,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 9999,
};

export const Fonts = {
  rounded: "System",
  mono: "Courier",
};
