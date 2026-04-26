import { AppError } from '../../shared/errors/AppError.js'
import { toPublicUser } from '../users/user.mapper.js'
import { UserModel } from '../users/user.model.js'
import type { PublicUser } from '../users/user.types.js'
import { createAccessTokenInfo, createRefreshToken, verifyRefreshToken } from './auth.tokens.js'
import { hashPassword, verifyPassword } from './auth.password.js'
import type { AuthResponse, RefreshResponse } from './auth.types.js'

interface RegisterInput {
  email: string
  password: string
  name?: string
}

interface LoginInput {
  email: string
  password: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8
const MAX_NAME_LENGTH = 120

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function normalizeName(name: unknown): string | undefined {
  if (typeof name !== 'string') {
    return undefined
  }

  const value = name.trim()

  return value ? value : undefined
}

function assertValidEmail(email: unknown): asserts email is string {
  if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim().toLowerCase())) {
    throw new AppError('Укажите корректный email.', 400, {
      code: 'validation_error',
    })
  }
}

function assertValidPassword(password: unknown): asserts password is string {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new AppError(`Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов.`, 400, {
      code: 'validation_error',
    })
  }
}

function assertValidName(name: unknown): void {
  if (name == null || name === '') {
    return
  }

  if (typeof name !== 'string' || name.trim().length > MAX_NAME_LENGTH) {
    throw new AppError(`Имя должно быть не длиннее ${MAX_NAME_LENGTH} символов.`, 400, {
      code: 'validation_error',
    })
  }
}

function buildAuthSession() {
  return {
    mode: 'account' as const,
    status: 'authenticated' as const,
  }
}

function buildAuthResponse(user: PublicUser): AuthResponse {
  return {
    user,
    session: buildAuthSession(),
    tokens: createAccessTokenInfo(user),
  }
}

function buildRefreshResponse(user: PublicUser): RefreshResponse {
  return {
    session: buildAuthSession(),
    tokens: createAccessTokenInfo(user),
  }
}

export async function register(input: RegisterInput): Promise<{ response: AuthResponse; refreshToken: string }> {
  assertValidEmail(input.email)
  assertValidPassword(input.password)
  assertValidName(input.name)

  const email = normalizeEmail(input.email)
  const name = normalizeName(input.name)

  const existingUser = await UserModel.exists({ email })

  if (existingUser) {
    throw new AppError('Пользователь с таким email уже существует.', 409, {
      code: 'email_conflict',
    })
  }

  const passwordHash = await hashPassword(input.password)
  const user = await UserModel.create({
    email,
    passwordHash,
    ...(name ? { name } : {}),
  })

  const publicUser = toPublicUser(user)

  return {
    response: buildAuthResponse(publicUser),
    refreshToken: createRefreshToken(publicUser.id),
  }
}

export async function login(input: LoginInput): Promise<{ response: AuthResponse; refreshToken: string }> {
  assertValidEmail(input.email)
  assertValidPassword(input.password)

  const email = normalizeEmail(input.email)
  const user = await UserModel.findOne({ email }).select('+passwordHash')

  if (!user?.passwordHash) {
    throw new AppError('Неверный email или пароль.', 401, {
      code: 'invalid_credentials',
    })
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash)

  if (!passwordMatches) {
    throw new AppError('Неверный email или пароль.', 401, {
      code: 'invalid_credentials',
    })
  }

  const publicUser = toPublicUser(user)

  return {
    response: buildAuthResponse(publicUser),
    refreshToken: createRefreshToken(publicUser.id),
  }
}

export async function refreshSession(refreshToken: string): Promise<{ response: RefreshResponse; refreshToken: string }> {
  const payload = verifyRefreshToken(refreshToken)
  const user = await UserModel.findById(payload.sub)

  if (!user) {
    throw new AppError('Пользователь для refresh token не найден.', 401, {
      code: 'refresh_user_not_found',
    })
  }

  const publicUser = toPublicUser(user)

  return {
    response: buildRefreshResponse(publicUser),
    refreshToken: createRefreshToken(publicUser.id),
  }
}

export async function getCurrentUser(userId: string): Promise<{ user: PublicUser; session: ReturnType<typeof buildAuthSession> }> {
  const user = await UserModel.findById(userId)

  if (!user) {
    throw new AppError('Пользователь не найден.', 404, {
      code: 'user_not_found',
    })
  }

  return {
    user: toPublicUser(user),
    session: buildAuthSession(),
  }
}
