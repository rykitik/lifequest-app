import { Types } from 'mongoose'

import { AppError } from '../../shared/errors/AppError.js'
import { SettingsProfileModel } from './settings.model.js'
import { toPublicSettingsProfile } from './settings.mapper.js'
import type {
  PublicSettingsProfile,
  SettingsPreferredTone,
  SettingsProfileDocument,
} from './settings.types.js'

interface UpdateSettingsProfileInput {
  userName: unknown
  userRole: unknown
  preferredTone: unknown
  deviceId: unknown
  body: Record<string, unknown>
}

const ALLOWED_UPDATE_KEYS = new Set(['userName', 'userRole', 'preferredTone', 'deviceId'])
const MAX_USER_NAME_LENGTH = 80
const MAX_USER_ROLE_LENGTH = 120
const MAX_DEVICE_ID_LENGTH = 120

function normalizeOptionalText(value: unknown) {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim()
  return normalized || undefined
}

function assertObjectId(userId: string) {
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError('Некорректный идентификатор пользователя.', 400, {
      code: 'validation_error',
    })
  }
}

function assertNoUnexpectedKeys(body: Record<string, unknown>) {
  const unexpectedKeys = Object.keys(body).filter((key) => !ALLOWED_UPDATE_KEYS.has(key))

  if (!unexpectedKeys.length) {
    return
  }

  throw new AppError('Запрос содержит неподдерживаемые поля.', 400, {
    code: 'validation_error',
    details: {
      unexpectedKeys,
    },
  })
}

function assertPreferredTone(value: unknown): asserts value is SettingsPreferredTone {
  if (value == null) {
    return
  }

  if (value !== 'calm' && value !== 'direct' && value !== 'supportive') {
    throw new AppError('Предпочтительный тон указан некорректно.', 400, {
      code: 'validation_error',
    })
  }
}

function assertLength(value: string | undefined, maxLength: number, fieldLabel: string) {
  if (!value) {
    return
  }

  if (value.length > maxLength) {
    throw new AppError(`${fieldLabel} не должно быть длиннее ${maxLength} символов.`, 400, {
      code: 'validation_error',
    })
  }
}

async function createDefaultSettingsProfile(userId: string) {
  return SettingsProfileModel.create({
    userId: new Types.ObjectId(userId),
    preferredTone: 'calm',
    syncVersion: 1,
  })
}

async function findOrCreateSettingsProfile(userId: string): Promise<SettingsProfileDocument> {
  assertObjectId(userId)

  const existingProfile = await SettingsProfileModel.findOne({ userId })

  if (existingProfile) {
    return existingProfile
  }

  return createDefaultSettingsProfile(userId)
}

export async function getSettingsProfile(userId: string): Promise<PublicSettingsProfile> {
  const profile = await findOrCreateSettingsProfile(userId)
  return toPublicSettingsProfile(profile)
}

export async function updateSettingsProfile(
  userId: string,
  input: UpdateSettingsProfileInput,
): Promise<PublicSettingsProfile> {
  assertObjectId(userId)
  assertNoUnexpectedKeys(input.body)
  assertPreferredTone(input.preferredTone)

  const normalizedUserName = normalizeOptionalText(input.userName)
  const normalizedUserRole = normalizeOptionalText(input.userRole)
  const normalizedDeviceId = normalizeOptionalText(input.deviceId)

  assertLength(normalizedUserName, MAX_USER_NAME_LENGTH, 'Имя')
  assertLength(normalizedUserRole, MAX_USER_ROLE_LENGTH, 'Роль')
  assertLength(normalizedDeviceId, MAX_DEVICE_ID_LENGTH, 'Device ID')

  const profile = await findOrCreateSettingsProfile(userId)

  const nextPreferredTone = input.preferredTone ?? profile.preferredTone
  const hasChanges =
    (profile.userName ?? undefined) !== normalizedUserName ||
    (profile.userRole ?? undefined) !== normalizedUserRole ||
    profile.preferredTone !== nextPreferredTone ||
    (profile.deviceId ?? undefined) !== normalizedDeviceId

  if (!hasChanges) {
    return toPublicSettingsProfile(profile)
  }

  profile.userName = normalizedUserName
  profile.userRole = normalizedUserRole
  profile.preferredTone = nextPreferredTone
  profile.deviceId = normalizedDeviceId
  profile.syncVersion += 1

  await profile.save()

  return toPublicSettingsProfile(profile)
}
