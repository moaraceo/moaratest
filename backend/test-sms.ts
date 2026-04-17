import coolsms from 'coolsms-node-sdk'

const API_KEY = 'NCSBTQQNX1VHHCMZ'
const API_SECRET = 'LH6UYHFZ4UEICAEYZKCWDQC77JHKFREA'
const FROM = '01021322229'
const TO = '01021322229'

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
