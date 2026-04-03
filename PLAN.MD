# MOARA PLAN.MD

AI 코딩 에이전트(Cursor / Claude Code)에게 주는 개발 계획서
PRD v3.0 + 하네스 프롬프트 v1.0 기반

# 사용법

이 파일을 프로젝트 루트에 PLAN.MD로 저장하세요.
Cursor에서 "@PLAN.MD" 로 참조하거나,
Claude Code에서 "PLAN.MD를 읽고 PHASE 1부터 시작해줘" 라고 입력하면 돼요.

# 업데이트 기준

2026년 3월 / MOARA MVP v1.0

---

## 📌 이 문서의 구조

각 PHASE는 아래 4가지 항목으로 구성돼요 (이미지 기준):

1. **접근 방식 + 상세 설명** — 왜 이렇게 구현하는지
2. **코드 스니펫** — 핵심 코드 패턴 (복사해서 쓸 수 있는 수준)
3. **파일 경로** — 어느 폴더에 어떤 파일을 만들어야 하는지
4. **트레이드오프** — 이 방식의 장점과 한계, 주의사항

---

## 🔒 고정 규칙 (절대 변경 금지)

AI가 이 규칙을 어기는 코드를 제안하면 즉시 거절하세요.

- 기술 스택: React Native (Expo SDK 55) + Node.js (Express) + PostgreSQL + AWS
- 코드 스타일: ESLint Airbnb 규칙 적용
- 폴더 구조: /client (앱) / /server (API) / /shared (공통 모델) 3분리
- 금액 필드: 반드시 BIGINT, 원 미만 절사는 Math.floor
- 급여 계산 로직: /server/payroll/ 폴더에만 작성
- 세금 공제 코드: 절대 작성 금지 (소득세·고용보험 등)
- GPS 인증: Wi-Fi 보조 인증과 반드시 병행
- 토큰 저장: AsyncStorage 금지 → expo-secure-store 사용
- 테스트: 급여 계산 함수는 Jest 단위 테스트 필수
- 진행 방식: 한 PHASE씩, 완료 후 확인 요청

---

## PHASE 0 — 프로젝트 환경 설정

### 접근 방식 + 상세 설명

프로젝트 생성부터 폴더 구조, ESLint 설정까지 한 번에 잡아요

# 이 단계를 건너뛰면 나중에 폴더 구조가 뒤섞여서 수정이 어려워져요

# 특히 /server/payroll/ 폴더 분리는 급여 계산 QA의 핵심이에요

approach: |
Expo SDK 55 기반으로 React Native 앱 프로젝트를 생성하고,
Node.js Express 백엔드와 폴더 구조를 분리 세팅한다.
ESLint Airbnb 규칙을 초기에 강제해서 코드 일관성을 확보한다.

### ② 코드 스니펫

```bash
# 프로젝트 생성
npx create-expo-app moara
cd moara

# 백엔드 폴더 생성
mkdir -p server/routes server/payroll/__tests__ server/models server/middleware
mkdir -p client/src/screens/manager client/src/screens/staff client/src/components
mkdir -p shared

# ESLint 설치 (Airbnb 규칙)
npm install --save-dev eslint eslint-config-airbnb eslint-plugin-react

# Jest 설치
npm install --save-dev jest
```

### ③ 파일 경로

```
moara/
├── client/                        # React Native 앱 (Expo)
│   └── src/
│       ├── screens/
│       │   ├── manager/           # 사장님 모드 화면
│       │   └── staff/             # 직원 모드 화면
│       ├── components/            # 공통 UI 컴포넌트
│       ├── hooks/                 # 커스텀 훅
│       └── utils/                 # 유틸 함수
├── server/                        # Node.js API 서버
│   ├── routes/                    # API 라우터
│   ├── payroll/                   # 급여 계산 엔진 (핵심)
│   │   └── __tests__/             # Jest 테스트 파일
│   ├── models/                    # DB 모델
│   └── middleware/                # 인증·로깅 미들웨어
├── shared/                        # 공통 타입·상수
├── .env                           # 환경변수 (gitignore 필수)
├── .gitignore
├── PLAN.MD                        # 이 파일
└── package.json
```

### ④ 트레이드오프

# 장점

# - 폴더 구조를 초기에 확정하면 AI가 파일을 엉뚱한 곳에 만드는 걸 막을 수 있어요

# - /payroll/ 폴더 분리로 급여 계산 로직 QA가 쉬워져요

# 주의

# - .env 파일을 절대 Git에 올리면 안 돼요 (DB 비밀번호, JWT 키 등 포함)

# - Expo SDK 55는 New Architecture 강제 적용 — 구버전 라이브러리 호환 확인 필요

tradeoffs:
pros: - 구조 확정으로 AI의 임의 파일 생성 방지 - payroll 폴더 분리로 급여 로직 QA 용이
cons: - SDK 55 New Architecture 강제 → 일부 구버전 라이브러리 비호환 가능
caution: - .env → .gitignore 등록 필수 (JWT_SECRET, DATABASE_URL 포함)

---

## PHASE 1 — 계정 및 인증

### ① 접근 방식 + 상세 설명

# 휴대폰 번호 인증 기반 회원가입을 구현해요

# JWT Access Token(1시간) + Refresh Token(30일) 구조로 로그인 상태를 유지해요

# 토큰은 반드시 expo-secure-store에 저장 (AsyncStorage 금지 — 평문 노출 위험)

# 사업주 / 직원 역할을 가입 시점에 선택하고, 이후 모든 API에서 역할 기반 접근 제어

approach: |
SMS 인증 번호 6자리 → 인증 완료 → JWT 발급 → SecureStore 저장.
멀티 워크스페이스: user_workplaces 조인 테이블로 1:N 관계 설계.
N잡러 중복 출근 방지: A매장 퇴근 미처리 시 B매장 출근 버튼 비활성화.

### ② 코드 스니펫

```javascript
// server/routes/auth.js — JWT 토큰 발급 패턴
const jwt = require("jsonwebtoken");

const issueTokens = (userId, role) => ({
  accessToken: jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  }),
  refreshToken: jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  }),
});

// client/src/utils/tokenStorage.js — SecureStore 저장 패턴
import * as SecureStore from "expo-secure-store";

export const saveToken = (key, val) => SecureStore.setItemAsync(key, val);
export const getToken = (key) => SecureStore.getItemAsync(key);
export const deleteToken = (key) => SecureStore.deleteItemAsync(key);

// server/middleware/auth.js — 토큰 검증 미들웨어
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};
```

### ③ 파일 경로

```
server/
├── routes/
│   └── auth.js                    # POST /auth/signup, /auth/login, /auth/refresh
├── models/
│   ├── User.js                    # users 테이블 (id, phone, role, created_at)
│   └── UserWorkplace.js           # user_workplaces 테이블 (N잡러 N:M 관계)
└── middleware/
    └── auth.js                    # JWT 검증 미들웨어

client/src/
├── screens/
│   └── auth/
│       ├── PhoneInputScreen.js    # 휴대폰 번호 입력
│       ├── OtpScreen.js           # SMS 인증번호 입력
│       └── RoleSelectScreen.js    # 사업주 / 직원 선택
└── utils/
    └── tokenStorage.js            # SecureStore 래퍼
```

### ④ 트레이드오프

# 장점

# - SecureStore는 iOS Keychain / Android Keystore에 암호화 저장 → 탈취 어려움

# - JWT Refresh 구조로 사용자가 매번 로그인할 필요 없음

# 주의

# - SMS 인증 서비스(알리고, NHN 등) 별도 비용 발생 — 외주 계약 시 포함 여부 확인

# - Refresh Token 탈취 시 대응 방안 (Token Rotation 또는 블랙리스트 DB) 필요

tradeoffs:
pros: - SecureStore 암호화 저장으로 토큰 보안 강화 - Refresh Token 구조로 UX 개선
cons: - SMS 인증 API 비용 별도 (월 사용량 기준) - Refresh Token 탈취 대응 로직 추가 구현 필요

---

## PHASE 2 — 근태 관리

### ① 접근 방식 + 상세 설명

# GPS 인증을 1차로 시도하고, 오차 발생 시 Wi-Fi SSID 일치 여부로 2차 인증해요

# GPS만 단독으로 쓰면 지하 매장·밀집 상가에서 30~50m 오차로 출퇴근 불가 문제 발생

# 거리 계산은 서버에서 수행 — 클라이언트 좌표값은 신뢰하지 않음

# 출퇴근 수정 이력(Audit Trail)은 삭제 불가로 영구 보존 — 급여 분쟁 증빙용

approach: |
GPS 성공 → 통과 / GPS 실패 + Wi-Fi SSID 일치 → 통과 / 둘 다 실패 → 수동 승인 요청.
실시간 반영: socket.io로 출퇴근 이벤트 사장님 앱에 즉시 emit.
Audit Trail: attendance_audit 테이블에 수정 전/후/사유/수정자 영구 기록.

### ② 코드 스니펫

```javascript
// server/routes/attendance.js — 거리 계산 (서버 수행)
const getDistance = (lat1, lon1, lat2, lon2) => {
  // Haversine 공식 — 두 GPS 좌표 간 거리(미터) 계산
  const R = 6371000; // 지구 반지름(m)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// 출근 인증 로직
const clockIn = async (req, res) => {
  const { userId, gpsLat, gpsLng, wifiSsid } = req.body;
  const workplace = await getWorkplace(userId);

  const dist = getDistance(gpsLat, gpsLng, workplace.lat, workplace.lng);
  const gpsOk = dist <= 50; // 50m 이내
  const wifiOk = wifiSsid === workplace.registeredSsid;

  if (!gpsOk && !wifiOk) {
    return res.status(403).json({ status: "NEEDS_MANUAL_APPROVAL" });
  }
  // DB 저장 후 socket.io 이벤트 발송
  await saveClockIn(userId);
  io.to(workplace.id).emit("attendance_update", {
    staffName: req.user.name,
    type: "clock_in",
    time: new Date(),
  });
  res.json({ status: "OK" });
};

// Audit Trail — 수정 이력 기록 미들웨어
const auditLog = async ({ userId, prevTime, newTime, reason, modifiedBy }) => {
  await pool.query(
    `INSERT INTO attendance_audit
     (user_id, prev_time, new_time, reason, modified_by, modified_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [userId, prevTime, newTime, reason, modifiedBy],
  );
  // ※ 이 테이블은 DELETE 권한 없음 — 영구 보존
};
```

### ③ 파일 경로

```
server/
├── routes/
│   └── attendance.js              # POST /attendance/clock-in, /clock-out, /modify
├── models/
│   ├── Attendance.js              # attendance_logs 테이블
│   └── AttendanceAudit.js         # attendance_audit 테이블 (삭제 불가)
└── middleware/
    └── audit.js                   # 수정 이력 자동 기록 미들웨어

client/src/
└── screens/
    ├── staff/
    │   └── ClockScreen.js         # 직원 출퇴근 버튼 화면
    └── manager/
        └── DashboardScreen.js     # 사장님 실시간 대시보드
```

### ④ 트레이드오프

# 장점

# - GPS + Wi-Fi 병행으로 지하 매장 대응 가능

# - 서버 거리 계산으로 클라이언트 위조 방지

# - Audit Trail 영구 보존으로 분쟁 시 증빙 확보

# 주의

# - Wi-Fi SSID는 사용자가 임의로 변경 가능 — 보안 완벽하지 않음

# - socket.io 연결이 끊기면 실시간 반영 안 됨 → 재연결 로직 필수

# - 실기기 GPS 테스트 필요 (시뮬레이터 mock 좌표 사용)

tradeoffs:
pros: - GPS + Wi-Fi 이중 인증으로 지하 매장 대응 - 서버 거리 계산 → 클라이언트 위조 차단 - Audit Trail 영구 보존 → 분쟁 증빙
cons: - Wi-Fi SSID 보안 한계 존재 (완벽한 인증 아님) - socket.io 재연결 로직 추가 구현 필요

---

## PHASE 3 — 급여 기초 계산 엔진 (핵심)

### ① 접근 방식 + 상세 설명

# 이 PHASE가 MOARA의 핵심이에요. 계산 오류 = 급여 분쟁 = 앱 신뢰도 붕괴

# TDD(테스트 주도 개발) 방식으로 — 테스트 케이스 먼저 작성 후 함수 구현

# 세금 공제(소득세, 고용보험 등)는 이 PHASE에서 절대 구현하지 않아요

# 퇴사 주차 주휴수당은 자동 제외 금지 → NEEDS_REVIEW 반환 후 사업주 판단

approach: |
basicPay → weeklyAllowance → overtimePay/nightPay → grossPay 순서로 구현.
각 함수마다 Jest 단위 테스트 100% 통과 확인 후 다음 함수로 진행.
금액은 전부 BIGINT(정수), Math.floor로 원 미만 절사.

### ② 코드 스니펫

```javascript
// server/payroll/basicPay.js
// 기본급 = Math.floor(승인된_근무분 / 60 * 시급)
const basicPay = (workMinutes, hourlyWage) => {
  if (workMinutes < 0 || hourlyWage < 0) throw new Error("Invalid input");
  return Math.floor((workMinutes / 60) * hourlyWage); // ← Math.round 금지
};

// server/payroll/weeklyAllowance.js
// 주휴수당 = Math.floor((주_소정근로시간 / 40) * 8 * 시급)
const weeklyAllowance = (weeklyMinutes, hourlyWage, isResignWeek = false) => {
  const weeklyHours = weeklyMinutes / 60;
  if (weeklyHours < 15) return 0; // 15시간 미충족 → 0원
  if (isResignWeek) return "NEEDS_REVIEW"; // 퇴사 주차 → 사업주 판단
  return Math.floor((weeklyHours / 40) * 8 * hourlyWage);
};

// server/payroll/overtimePay.js
// 연장수당 = 초과시간 × 시급 × 0.5 (가산분만)
const overtimePay = (totalMinutes, hourlyWage) => {
  const overtime = Math.max(0, totalMinutes - 480); // 8시간(480분) 초과분
  return Math.floor((overtime / 60) * hourlyWage * 0.5);
};

// server/payroll/nightPay.js
// 야간수당 = 22:00~06:00 근무시간 × 시급 × 0.5
const calcNightMinutes = (clockIn, clockOut) => {
  // 자정 분리 처리 포함 (예: 23:30~01:30)
  // 구현 시 날짜 변경선 처리 필수
};

// server/payroll/grossPay.js — 세전 합계
const grossPay = (basic, weekly, overtime, night) => {
  // weekly가 'NEEDS_REVIEW'인 경우 합계에서 제외하고 플래그 반환
  const weeklyAmt = weekly === "NEEDS_REVIEW" ? 0 : weekly;
  return {
    total: basic + weeklyAmt + overtime + night,
    weeklyFlag: weekly === "NEEDS_REVIEW" ? "NEEDS_REVIEW" : null,
    // ※ 세금 공제 없음 — 세전 합계만 반환
  };
};
```

### ③ 파일 경로

```
server/payroll/
├── basicPay.js                    # 기본급 계산
├── weeklyAllowance.js             # 주휴수당 계산
├── overtimePay.js                 # 연장수당 계산
├── nightPay.js                    # 야간수당 계산
├── grossPay.js                    # 세전 합계
└── __tests__/
    ├── basicPay.test.js           # Jest 테스트
    ├── weeklyAllowance.test.js
    ├── overtimePay.test.js
    ├── nightPay.test.js
    └── grossPay.test.js
```

### ④ 트레이드오프

# 장점

# - 함수 단위 분리로 계산 오류 위치 즉시 파악 가능

# - TDD로 계산 정확성 보장 (납품 검수 기준)

# - NEEDS_REVIEW 패턴으로 법적 판단을 앱이 대신하지 않음

# 주의

# - 야간수당 자정 분리 처리(23:30~01:30 등)는 구현 복잡도 높음 → 별도 테스트 필수

# - grossPay에 세금 공제 코드가 추가되면 즉시 제거 요청

tradeoffs:
pros: - 함수 단위 분리 → 오류 위치 즉시 파악 - TDD → 납품 검수 기준 명확 - NEEDS_REVIEW → 법적 판단 사업주 위임
cons: - 야간 자정 분리 로직 복잡도 높음 - 퇴사 주차 NEEDS_REVIEW UI 처리 추가 필요

---

## PHASE 4 — 사장님 승인 · 정산 대시보드

### ① 접근 방식 + 상세 설명

# 4060 사장님이 주 사용자예요 — 버튼 크고, 텍스트 크고, 화면 단순하게

# 핵심 액션(승인/반려) 버튼은 화면 하단 고정 (엄지로 누르기 편하게)

# AI 체크리스트: 미승인 건 / 퇴사자 승인 누락 / 최저시급 미달을 자동 감지해서 뱃지로 표시

# 급여 확정 화면에는 법적 면책 고지 문구가 반드시 표시되어야 확정 버튼 활성화

approach: |
미승인 근태 목록 → 승인/반려/수정요청 3가지 액션.
월별 정산: [성명 | 재직상태 | 실근무시간 | 주휴여부 | 세전지급액] 리스트.
NEEDS_REVIEW 상태 직원은 주황색 경고 표시.
급여 확정 → 면책 고지 동의 → PDF 저장/공유.

### ② 코드 스니펫

```javascript
// client/src/screens/manager/ApprovalScreen.js
// 승인/반려 버튼 하단 고정 패턴 (React Native)
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

const ApprovalScreen = () => (
  <View style={styles.container}>
    {/* 근태 상세 내용 */}
    <View style={styles.content}>
      <Text style={styles.staffName}>홍길동</Text>
      {/* ... */}
    </View>

    {/* 하단 고정 버튼 — 4060 UX */}
    <View style={styles.bottomBar}>
      <TouchableOpacity style={styles.btnReject}>
        <Text style={styles.btnText}>반 려</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnApprove}>
        <Text style={styles.btnText}>승 인</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
  },
  btnApprove: {
    flex: 1,
    backgroundColor: "#1F4E79",
    padding: 18,
    borderRadius: 8,
  },
  btnReject: {
    flex: 1,
    backgroundColor: "#C00000",
    padding: 18,
    borderRadius: 8,
    marginRight: 8,
  },
  btnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
});

// 법적 면책 고지 컴포넌트 — 미동의 시 확정 버튼 비활성화
const DisclaimerSection = ({ agreed, onAgree, onConfirm }) => (
  <View>
    <Text style={{ color: "#777", fontSize: 13 }}>
      본 앱의 계산값은 참고용이며, 최종 급여 지급액은{"\n"}
      사업주가 관련 법령에 따라 확인·책임집니다.
    </Text>
    <TouchableOpacity onPress={onAgree}>
      <Text>{agreed ? "☑" : "☐"} 위 내용을 확인했습니다</Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={{ opacity: agreed ? 1 : 0.3 }} // 미동의 시 흐리게
      disabled={!agreed}
      onPress={onConfirm}
    >
      <Text>급여 확정</Text>
    </TouchableOpacity>
  </View>
);
```

### ③ 파일 경로

```
client/src/screens/manager/
├── DashboardScreen.js             # 오늘 출퇴근 현황 + AI 체크리스트 뱃지
├── ApprovalScreen.js              # 근태 승인/반려 화면 (하단 고정 버튼)
├── MonthlySettlementScreen.js     # 월별 정산 리스트
└── PayslipDetailScreen.js         # 직원별 급여 명세서 + 면책 고지 + PDF

server/routes/
└── payroll.js                     # GET /payroll/monthly, POST /payroll/confirm
```

### ④ 트레이드오프

# 장점

# - 하단 고정 버튼으로 4060 사용자 UX 최적화

# - 면책 고지 동의 강제로 법적 보호 장치 확보

# - NEEDS_REVIEW 주황 표시로 사업주 판단 유도

# 주의

# - 텍스트 크기 가변 (16sp~20sp) — 시스템 폰트 크기 설정 연동 테스트 필요

# - PDF 생성은 expo-print 사용 (세전 항목만 포함, 세금 항목 절대 금지)

tradeoffs:
pros: - 하단 고정 버튼 → 4060 UX 최적화 - 면책 고지 동의 강제 → 법적 보호
cons: - 시스템 폰트 크기 연동 테스트 필요 - PDF에 세금 항목 포함되지 않도록 QA 필요

---

## PHASE 5 — 직원 모드

### ① 접근 방식 + 상세 설명

# 직원 입장에서 가장 중요한 건 "내가 얼마 받는지" 투명하게 보이는 것

# 주휴수당 프로그레스 바로 15시간 기준선을 시각화 — 동기부여 효과

# 동기부여 알림: 주휴수당까지 몇 시간 남았는지 실시간 계산해서 표시

approach: |
출근/퇴근 버튼 (GPS·Wi-Fi 인증 연동).
주간 누적 근무시간 프로그레스 바 (15시간 기준선 표시).
세전 예상 급여 실시간 표시.
동기부여 알림: "1시간 더 근무 시 주휴수당 40,120원 추가".

### ② 코드 스니펫

```javascript
// client/src/screens/staff/MainScreen.js
// 주휴수당 동기부여 알림 계산 패턴
const calcWeeklyAllowanceNotice = (currentWeekMinutes, hourlyWage) => {
  const THRESHOLD_MINUTES = 15 * 60; // 15시간 = 900분
  const remaining = THRESHOLD_MINUTES - currentWeekMinutes;

  if (remaining <= 0) {
    // 이미 주휴수당 충족
    const amount = Math.floor((currentWeekMinutes / 60 / 40) * 8 * hourlyWage);
    return `✅ 주휴수당 ${amount.toLocaleString()}원 확정됐어요!`;
  }

  // 충족까지 남은 시간으로 예상 주휴수당 계산
  const projectedHours = THRESHOLD_MINUTES / 60;
  const projectedAmount = Math.floor((projectedHours / 40) * 8 * hourlyWage);
  const remainHours = Math.ceil(remaining / 60);

  return `${remainHours}시간 더 근무하면 주휴수당 ${projectedAmount.toLocaleString()}원이 추가돼요`;
};

// 주간 프로그레스 바 컴포넌트
const WeeklyProgressBar = ({ currentMinutes }) => {
  const progress = Math.min(currentMinutes / (15 * 60), 1); // 15h 기준 최대 100%
  return (
    <View>
      <View style={{ height: 8, backgroundColor: "#eee", borderRadius: 4 }}>
        <View
          style={{
            height: 8,
            borderRadius: 4,
            backgroundColor: "#1F4E79",
            width: `${progress * 100}%`,
          }}
        />
      </View>
      <Text>
        이번 주 {Math.floor(currentMinutes / 60)}시간 / 주휴수당 기준 15시간
      </Text>
    </View>
  );
};
```

### ③ 파일 경로

```
client/src/screens/staff/
├── MainScreen.js                  # 출퇴근 버튼 + 프로그레스 바 + 예상 급여
├── PayslipScreen.js               # 내 급여 명세서 (항목별 세전 내역)
└── ModifyRequestScreen.js         # 근태 수정 요청 발송 화면
```

### ④ 트레이드오프

# 장점

# - 주휴수당 프로그레스 바로 직원 근무 동기 부여

# - 세전 금액 투명 공개로 급여 분쟁 예방

# 주의

# - 예상 급여는 승인 전 데이터 기반 — 사장님 승인 후 확정액과 다를 수 있음

# - "예상" 표시 명확히 해야 혼동 방지

tradeoffs:
pros: - 주휴수당 프로그레스 바 → 직원 동기부여 - 투명한 세전 금액 공개 → 분쟁 예방
cons: - 예상 급여는 미승인 데이터 기반 → "예상" 표기 필수

---

## PHASE 6 — 보안 · 배포 · 인수인계

### ① 접근 방식 + 상세 설명

# 급여·개인정보 데이터를 다루는 앱이라 보안 설정이 필수예요

# AES-256 DB 암호화, Rate Limiting, HTTPS 강제를 적용해요

# EAS Build로 iOS/Android 동시 빌드 후 앱스토어 제출

# 인수인계 시 소스코드·서버 접속 정보·환경변수 목록을 반드시 받아야 해요

approach: |
helmet + express-rate-limit → API 보안 기본 설정.
개인정보 필드(성명, 연락처) AES-256 암호화.
EAS Build → eas build --platform all.
납품 체크리스트 확인 후 최종 인수인계.

### ② 코드 스니펫

```javascript
// server/index.js — 보안 미들웨어 적용 순서
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const app = express();

// 1. 보안 헤더 (최상단)
app.use(helmet());

// 2. Rate Limiting — 동일 IP 분당 60회 제한
app.use(
  rateLimit({
    windowMs: 60 * 1000, // 1분
    max: 60,
    message: { error: "Too many requests" },
  }),
);

// 3. HTTPS 강제 (프로덕션)
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (req.header("x-forwarded-proto") !== "https") {
      return res.redirect(`https://${req.header("host")}${req.url}`);
    }
    next();
  });
}

// 4. 라우터 등록 (미들웨어 이후)
app.use("/auth", require("./routes/auth"));
app.use("/attendance", require("./routes/attendance"));
app.use("/payroll", require("./routes/payroll"));
```

```bash
# EAS Build — iOS + Android 동시 빌드
eas build --platform all

# 앱스토어 자동 제출
eas submit --platform all
```

### ③ 파일 경로

```
server/
├── index.js                       # 미들웨어 순서: helmet → rateLimit → HTTPS → routes
└── middleware/
    └── security.js                # AES-256 암호화 유틸

# 납품 인수인계 체크리스트
납품_체크리스트.md
├── Git 저장소 URL + 접근 권한
├── AWS EC2 접속 키 (.pem 파일)
├── RDS 접속 정보 (host, port, db, user, password)
├── .env 목록 및 설명 (JWT_SECRET, DATABASE_URL, FCM_KEY 등)
├── 앱스토어 개발자 계정 정보
└── 운영 가이드 문서 (서버 재시작, 배포 방법)
```

### ④ 트레이드오프

# 장점

# - helmet 한 줄로 주요 HTTP 보안 헤더 자동 적용

# - Rate Limiting으로 브루트포스 공격 방어

## - EAS Build로 iOS/Android 동시 빌드 가능

## 주의

## - iOS 배포: Apple Developer Program 연 $99 필요

# - Android 배포: Google Play Console $25 (1회)

# - 인수인계 항목 누락 시 이후 유지보수 불가 → 계약서에 납품 항목 명시 필수

tradeoffs:
pros: - helmet 단일 적용으로 보안 헤더 자동 처리 - EAS Build로 iOS/Android 동시 배포 가능
cons: - iOS 배포: Apple Developer Program 연 $99 - Android 배포: $25 1회 등록비
caution: - 인수인계 체크리스트 계약서에 명시 필수

---

## ✅ 진행 체크리스트

# 각 PHASE 완료 시 [ ] → [x] 로 바꾸세요

- [ ] PHASE 0 — 환경 설정 + 폴더 구조 생성
- [ ] PHASE 1-A — 회원가입 (SMS 인증 + JWT 발급)
- [ ] PHASE 1-B — 멀티 워크스페이스 (N잡러)
- [ ] PHASE 2-A — GPS + Wi-Fi 출퇴근 인증
- [ ] PHASE 2-B — 실시간 대시보드 + 푸시 알림
- [ ] PHASE 2-C — 수정 이력 관리 (Audit Trail)
- [ ] PHASE 3-A — 기본급 계산 + Jest 테스트
- [ ] PHASE 3-B — 주휴수당 계산 + Jest 테스트
- [ ] PHASE 3-C — 가산수당 계산 + Jest 테스트
- [ ] PHASE 3-D — 세전 합계 + 면책 고지 UI
- [ ] PHASE 4-A — 사장님 근태 승인·반려
- [ ] PHASE 4-B — 월별 정산 대시보드
- [ ] PHASE 5 — 직원 메인 화면 + 명세서
- [ ] PHASE 6-A — 보안 설정 (helmet + rate limit + AES-256)
- [ ] PHASE 6-B — EAS Build 배포 + 인수인계

---

## ⚠️ 절대 금지 목록

# AI가 아래 코드를 생성하면 즉시 거절하세요

- 세금 공제 코드 (소득세, 지방소득세, 고용보험 등)
- Math.round를 사용한 금액 계산 (Math.floor 사용)
- AsyncStorage에 JWT 토큰 저장
- GPS 단독 인증 (Wi-Fi 보조 인증 없이)
- attendance_audit 테이블 DELETE 쿼리
- 급여 확정 화면에 면책 고지 없음
- .env 파일 Git 커밋

---

# PLAN.MD 끝

— iOS + Android 동시 빌드
eas build --platform all

# 앱스토어 자동 제출

eas submit --platform all

```

### ③ 파일 경로

```

server/
├── index.js # 미들웨어 순서: helmet → rateLimit → HTTPS → routes
└── middleware/
└── security.js # AES-256 암호화 유틸

# 납품 인수인계 체크리스트

납품\_체크리스트.md
├── Git 저장소 URL + 접근 권한
├── AWS EC2 접속 키 (.pem 파일)
├── RDS 접속 정보 (host, port, db, user, password)
├── .env 목록 및 설명 (JWT_SECRET, DATABASE_URL, FCM_KEY 등)
├── 앱스토어 개발자 계정 정보
└── 운영 가이드 문서 (서버 재시작, 배포 방법)

```

### ④ 트레이드오프

# 장점

# - helmet 한 줄로 주요 HTTP 보안 헤더 자동 적용

# - Rate Limiting으로 브루트포스 공격 방어

# - EAS Build로 iOS/Android 동시 빌드 가능

# 주의

# - iOS 배포: Apple Developer Program 연 $99 필요

# - Android 배포: Google Play Console $25 (1회)

# - 인수인계 항목 누락 시 이후 유지보수 불가 → 계약서에 납품 항목 명시 필수

tradeoffs:
  pros:
    - helmet 단일 적용으로 보안 헤더 자동 처리
    - EAS Build로 iOS/Android 동시 배포 가능
  cons:
    - iOS 배포: Apple Developer Program 연 $99
    - Android 배포: $25 1회 등록비
  caution:
    - 인수인계 체크리스트 계약서에 명시 필수

---

## ✅ 진행 체크리스트

# 각 PHASE 완료 시 [ ] → [x] 로 바꾸세요

- [ ] PHASE 0 — 환경 설정 + 폴더 구조 생성
- [ ] PHASE 1-A — 회원가입 (SMS 인증 + JWT 발급)
- [ ] PHASE 1-B — 멀티 워크스페이스 (N잡러)
- [ ] PHASE 2-A — GPS + Wi-Fi 출퇴근 인증
- [ ] PHASE 2-B — 실시간 대시보드 + 푸시 알림
- [ ] PHASE 2-C — 수정 이력 관리 (Audit Trail)
- [ ] PHASE 3-A — 기본급 계산 + Jest 테스트
- [ ] PHASE 3-B — 주휴수당 계산 + Jest 테스트
- [ ] PHASE 3-C — 가산수당 계산 + Jest 테스트
- [ ] PHASE 3-D — 세전 합계 + 면책 고지 UI
- [ ] PHASE 4-A — 사장님 근태 승인·반려
- [ ] PHASE 4-B — 월별 정산 대시보드
- [ ] PHASE 5 — 직원 메인 화면 + 명세서
- [ ] PHASE 6-A — 보안 설정 (helmet + rate limit + AES-256)
- [ ] PHASE 6-B — EAS Build 배포 + 인수인계

---

## ⚠️ 절대 금지 목록

# AI가 아래 코드를 생성하면 즉시 거절하세요

- 세금 공제 코드 (소득세, 지방소득세, 고용보험 등)
- Math.round를 사용한 금액 계산 (Math.floor 사용)
- AsyncStorage에 JWT 토큰 저장
- GPS 단독 인증 (Wi-Fi 보조 인증 없이)
- attendance_audit 테이블 DELETE 쿼리
- 급여 확정 화면에 면책 고지 없음
- .env 파일 Git 커밋

---

# PLAN.MD 끝

# 이 파일은 Cursor의 @PLAN.MD 또는 Claude Code의 Read 기능으로 참조하세요
```

---

# PLAN.MD 끝

# 이 파일은 Cursor의 @PLAN.MD 또는 Claude Code의 Read 기능으로 참조하세요
