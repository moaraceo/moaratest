import { config } from '../config/index.js'

export async function sendSms(to: string, message: string): Promise<void> {
  const { provider, apiKey, apiSecret, from } = config.sms

  if (provider === 'mock') {
    console.log(`[SMS MOCK] To: ${to} | Message: ${message}`)
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
