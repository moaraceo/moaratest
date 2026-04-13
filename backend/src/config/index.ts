import 'dotenv/config'

function requireEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`환경변수 누락: ${key}`)
  return val
}

export const config = {
  port: parseInt(process.env['PORT'] ?? '3000', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',

  supabase: {
    url: requireEnv('SUPABASE_URL'),
    serviceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  },

  jwt: {
    accessSecret: requireEnv('JWT_ACCESS_SECRET'),
    refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
    accessExpires: process.env['JWT_ACCESS_EXPIRES'] ?? '1h',
    refreshExpires: process.env['JWT_REFRESH_EXPIRES'] ?? '30d',
  },

  sms: {
    provider: (process.env['SMS_PROVIDER'] ?? 'mock') as 'mock' | 'twilio',
    apiKey: process.env['SMS_API_KEY'] ?? '',
    apiSecret: process.env['SMS_API_SECRET'] ?? '',
    from: process.env['SMS_FROM'] ?? '',
  },
} as const
