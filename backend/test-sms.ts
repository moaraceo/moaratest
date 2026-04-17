import 'dotenv/config'
import coolsms from 'coolsms-node-sdk'

const API_KEY = process.env['SMS_API_KEY'] ?? ''
const API_SECRET = process.env['SMS_API_SECRET'] ?? ''
const FROM = process.env['SMS_FROM'] ?? ''
const TO = process.env['SMS_FROM'] ?? ''

if (!API_KEY || !API_SECRET || !FROM) {
  console.error('SMS 환경변수 누락: SMS_API_KEY, SMS_API_SECRET, SMS_FROM 설정 필요')
  process.exit(1)
}

async function main() {
  console.log('SDK keys:', Object.keys(coolsms as any))

  const MessageService = (coolsms as any).default ?? coolsms
  const ms = new MessageService(API_KEY, API_SECRET)
  console.log('인스턴스 생성 완료')

  try {
    const result = await ms.sendOne({
      to: TO,
      from: FROM,
      text: '[MOARA 테스트] 인증번호: 123456',
      autoTypeDetect: true,
    })
    console.log('발송 결과:', JSON.stringify(result, null, 2))
  } catch (err: any) {
    console.error('에러 메시지:', err?.message ?? err)
    console.error('에러 전체:', JSON.stringify(err, null, 2))
  }
}

main()
