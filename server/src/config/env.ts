import dotenv from 'dotenv'

dotenv.config()

type NodeEnv = 'development' | 'test' | 'production'
type SameSitePolicy = 'lax' | 'strict' | 'none'

const DEFAULT_ACCESS_SECRET = 'change-me-access'
const DEFAULT_REFRESH_SECRET = 'change-me-refresh'

function requireEnv(name: string, value: string | undefined): string {
  const normalizedValue = value?.trim()

  if (!normalizedValue) {
    throw new Error(`Environment variable "${name}" is required.`)
  }

  return normalizedValue
}

function parsePort(rawPort: string | undefined): number {
  const value = Number(rawPort ?? '4000')

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error('Environment variable "PORT" must be a positive integer.')
  }

  return value
}

function parseNodeEnv(rawNodeEnv: string | undefined): NodeEnv {
  const nodeEnv = (rawNodeEnv?.trim() || 'development') as NodeEnv

  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('Environment variable "NODE_ENV" must be development, test, or production.')
  }

  return nodeEnv
}

function parseBoolean(name: string, rawValue: string | undefined): boolean {
  const normalizedValue = rawValue?.trim().toLowerCase()

  if (normalizedValue === 'true') {
    return true
  }

  if (normalizedValue === 'false') {
    return false
  }

  throw new Error(`Environment variable "${name}" must be "true" or "false".`)
}

function parseSameSite(rawValue: string | undefined): SameSitePolicy {
  const normalizedValue = rawValue?.trim().toLowerCase() as SameSitePolicy | undefined

  if (!normalizedValue || !['lax', 'strict', 'none'].includes(normalizedValue)) {
    throw new Error('Environment variable "COOKIE_SAME_SITE" must be lax, strict, or none.')
  }

  return normalizedValue
}

function parseDurationMs(name: string, rawValue: string | undefined): number {
  const normalizedValue = requireEnv(name, rawValue).toLowerCase()
  const match = normalizedValue.match(/^(\d+)(ms|s|m|h|d)$/)

  if (!match) {
    throw new Error(`Environment variable "${name}" must look like 15m, 1h, or 30d.`)
  }

  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  }

  const amount = Number(match[1])
  const unit = match[2]

  if (!unit || !(unit in multipliers)) {
    throw new Error(`Environment variable "${name}" has an unsupported duration unit.`)
  }

  const multiplier = multipliers[unit as keyof typeof multipliers]

  if (typeof multiplier !== 'number') {
    throw new Error(`Environment variable "${name}" has an unsupported duration value.`)
  }

  return amount * multiplier
}

function validateSecret(name: string, value: string, defaultValue: string, nodeEnv: NodeEnv): string {
  if (nodeEnv === 'production' && value === defaultValue) {
    throw new Error(`Environment variable "${name}" must be changed in production.`)
  }

  return value
}

const cookieDomainValue = process.env.COOKIE_DOMAIN?.trim()
const nodeEnv = parseNodeEnv(process.env.NODE_ENV)
const cookieSameSite = parseSameSite(process.env.COOKIE_SAME_SITE)
const cookieSecure = parseBoolean('COOKIE_SECURE', process.env.COOKIE_SECURE)
const accessTokenTtl = requireEnv('ACCESS_TOKEN_TTL', process.env.ACCESS_TOKEN_TTL)
const refreshTokenTtl = requireEnv('REFRESH_TOKEN_TTL', process.env.REFRESH_TOKEN_TTL)

if (cookieSameSite === 'none' && !cookieSecure) {
  throw new Error('COOKIE_SAME_SITE="none" requires COOKIE_SECURE=true.')
}

export const env = {
  serviceName: 'lifequest-api',
  port: parsePort(process.env.PORT),
  nodeEnv,
  mongoUri: requireEnv('MONGO_URI', process.env.MONGO_URI),
  clientOrigin: requireEnv('CLIENT_ORIGIN', process.env.CLIENT_ORIGIN),
  cookieDomain: cookieDomainValue ? cookieDomainValue : null,
  jwtAccessSecret: validateSecret(
    'JWT_ACCESS_SECRET',
    requireEnv('JWT_ACCESS_SECRET', process.env.JWT_ACCESS_SECRET),
    DEFAULT_ACCESS_SECRET,
    nodeEnv,
  ),
  jwtRefreshSecret: validateSecret(
    'JWT_REFRESH_SECRET',
    requireEnv('JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET),
    DEFAULT_REFRESH_SECRET,
    nodeEnv,
  ),
  accessTokenTtl,
  accessTokenTtlMs: parseDurationMs('ACCESS_TOKEN_TTL', process.env.ACCESS_TOKEN_TTL),
  refreshTokenTtl,
  refreshTokenTtlMs: parseDurationMs('REFRESH_TOKEN_TTL', process.env.REFRESH_TOKEN_TTL),
  cookieSecure,
  cookieSameSite,
} as const
