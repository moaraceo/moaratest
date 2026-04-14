import { config } from '../config/index.js'

export async function sendSms(to: string, message: string): Promise<void> {
  const { provider, apiKey, apiSecret, from } = config.sms

  if (provider === 'mock') {
    console.log(`[SMS MOCK] To: ${to} | Message: ${message}`)
    return
  }

  if (provider === 'coolsms') {
    // 국내 번호 정규화: 01012345678 형태 유지 (CoolSMS는 01x 형식 직접 지원)
    const normalizedTo = to.replace(/[^0-9]/g, '')
    const normalizedFrom = from.replace(/[^0-9]/g, '')

    // coolsms-node-sdk는 CommonJS 모듈이므로 동적 임포트
    const coolsms = await import('coolsms-node-sdk')
    const MessageService = coolsms.default?.default ?? coolsms.default

    const ms = new MessageService(apiKey, apiSecret)
    await ms.sendOne({
      to: normalizedTo,
      from: normalizedFrom,
      text: message,
      autoTypeDetect: true,  // 글자 수 기준 SMS/LMS 자동 선택
    })
    return
  }

  if (provider === 'twilio') {
    const twilio = await import('twilio')
    const client = twilio.default(apiKey, apiSecret)
    const e164To = to.startsWith('+') ? to : '+82' + to.replace(/^0/, '')
    await client.messages.create({ body: message, from, to: e164To })
    return
  }

  throw new Error(`알 수 없는 SMS 프로바이더: ${provider}`)
}
