const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors()); // 모든 도메인 허용
app.use(express.json()); // JSON 데이터 파싱

// 기본 라우트
app.get("/", (req, res) => {
  res.send("MOARA API 서버 정상 작동 중");
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 MOARA 서버 실행중 :${PORT}`);
});
