// ─────────────────────────────────────────────────────────────────
// 사업장 공유 타입 (client + server 공통)
// ─────────────────────────────────────────────────────────────────

/**
 * 업종 코드
 * DB: workplaces.industry_code (VARCHAR 20)
 */
export type IndustryCode =
  | 'cafe'          // 카페·음료
  | 'restaurant'    // 음식점·식당
  | 'bar'           // 주점
  | 'convenience'   // 편의점
  | 'retail'        // 소매·잡화
  | 'academy'       // 학원
  | 'beauty'        // 미용·뷰티
  | 'other';        // 기타

/** 업종 코드 → 한글 레이블 매핑 */
export const INDUSTRY_LABELS: Record<IndustryCode, string> = {
  cafe:         '카페·음료',
  restaurant:   '음식점·식당',
  bar:          '주점',
  convenience:  '편의점',
  retail:       '소매·잡화',
  academy:      '학원',
  beauty:       '미용·뷰티',
  other:        '기타',
};

/**
 * 사업장 기본 인터페이스
 * - regionCode: 서버에서 GPS 역지오코딩으로 자동 생성 (ISO 3166-2:KR 기반 커스텀)
 *               예: 'SEL-GN'(서울 강남구), 'SEL-MP'(서울 마포구)
 * - gpsLat/gpsLng: 사업장 등록 시 기기 위치 자동 저장 (expo-location)
 */
export interface Workplace {
  id: string;
  ownerId: string;
  name: string;
  industryCode: IndustryCode | null;
  regionCode: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
}
