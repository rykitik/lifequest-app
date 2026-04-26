import dotenv from 'dotenv'

dotenv.config()

type NodeEnv = 'development' | 'test' | 'production'

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

const cookieDomainValue = process.env.COOKIE_DOMAIN?.trim()

export const env = {
  serviceName: 'lifequest-api',
  port: parsePort(process.env.PORT),
  nodeEnv: parseNodeEnv(process.env.NODE_ENV),
  mongoUri: requireEnv('MONGO_URI', process.env.MONGO_URI),
  clientOrigin: requireEnv('CLIENT_ORIGIN', process.env.CLIENT_ORIGIN),
  cookieDomain: cookieDomainValue ? cookieDomainValue : null,
} as const
