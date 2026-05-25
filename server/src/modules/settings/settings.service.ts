import mongoose from 'mongoose'

import { AppError } from '../../shared/errors/AppError.js'
import { UserModel } from '../users/user.model.js'
import { SettingsProfileModel } from './settings.model.js'
import { toPublicSettingsProfile } from './settings.mapper.js'
import type {
  PreferredTone,
  PublicSettingsProfile,
  SettingsProfileDocument,
  UpdateSettingsProfileInput,
} from './settings.types.js'

const ALLOWED_UPDATE_KEYS = ['userName', 'userRole', 'preferredTone', 'deviceId'] as const
const PREFERRED_TONES: PreferredTone[] = ['calm', 'direct', 'supportive']
const MAX_USER_NAME_LENGTH = 120
const MAX_USER_ROLE_LENGTH = 120
const MAX_DEVICE_ID_LENGTH = 160

function normalizeOptionalText(value: unknown): string | undefined {
  if (value == null) {
    return undefined
  }

  if (typeof value !== 'string') {
    throw new AppError('Поля настроек должны быть строками.', 400, {
      code: 'validation_error',
    })
  }

  const normalizedValue = value.trim()
  return normalizedValue || undefined
}

function assertNoUnknownFields(input: Record<string, unknown>) {
  const unknownFields = Object.keys(input).filter(
    (key) => !ALLOWED_UPDATE_KEYS.includes(key as (typeof ALLOWED_UPDATE_KEYS)[number]),
  )

  if (unknownFields.length > 0) {
    throw new AppError(`Лишние поля в запросе настроек: ${unknownFields.join(', ')}.`, 400, {
      code: 'validation_error',
    })
  }
}

function assertValidPreferredTone(value: unknown): asserts value is PreferredTone | undefined {
  if (value == null) {
    return
  }

  if (typeof value !== 'string' || !PREFERRED_TONES.includes(value as PreferredTone)) {
    throw new AppError('Предпочтительный тон должен быть calm, direct или supportive.', 400, {
      code: 'validation_error',
    })
  }
}

function assertTextLength(label: string, value: string | undefined, maxLength: number) {
  if (value && value.length > maxLength) {
    throw new AppError(`${label} не должен быть длиннее ${maxLength} символов.`, 400, {
      code: 'validation_error',
    })
  }
}

async function ensureUserExists(userId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('Некорректный userId для профиля настроек.', 400, {
      code: 'validation_error',
    })
  }

  const user = await UserModel.findById(userId)

  if (!user) {
    throw new AppError('Пользователь не найден.', 404, {
      code: 'user_not_found',
    })
  }

  return user
}

function buildUpdatePatch(input: UpdateSettingsProfileInput) {
  const userName = normalizeOptionalText(input.userName)
  const userRole = normalizeOptionalText(input.userRole)
  const deviceId = normalizeOptionalText(input.deviceId)

  assertValidPreferredTone(input.preferredTone)
  assertTextLength('Имя пользователя', userName, MAX_USER_NAME_LENGTH)
  assertTextLength('Роль', userRole, MAX_USER_ROLE_LENGTH)
  assertTextLength('ID устройства', deviceId, MAX_DEVICE_ID_LENGTH)

  return {
    userName,
    userRole,
    preferredTone: input.preferredTone,
    deviceId,
  }
}

async function createDefaultSettingsProfile(userId: string): Promise<SettingsProfileDocument> {
  const user = await ensureUserExists(userId)

  return SettingsProfileModel.create({
    userId: user._id,
    userName: user.name?.trim() || undefined,
    userRole: undefined,
    preferredTone: 'calm',
    syncVersion: 1,
  })
}

export async function getOrCreateSettingsProfile(userId: string): Promise<PublicSettingsProfile> {
  let profile = await SettingsProfileModel.findOne({ userId })

  if (!profile) {
    profile = await createDefaultSettingsProfile(userId)
  }

  return toPublicSettingsProfile(profile)
}

export async function updateSettingsProfile(
  userId: string,
  rawInput: Record<string, unknown>,
): Promise<PublicSettingsProfile> {
  assertNoUnknownFields(rawInput)

  const patch = buildUpdatePatch(rawInput)
  let profile = await SettingsProfileModel.findOne({ userId })

  if (!profile) {
    await ensureUserExists(userId)

    profile = await SettingsProfileModel.create({
      userId,
      userName: patch.userName,
      userRole: patch.userRole,
      preferredTone: patch.preferredTone ?? 'calm',
      deviceId: patch.deviceId,
      syncVersion: 1,
    })

    return toPublicSettingsProfile(profile)
  }

  const nextPreferredTone = patch.preferredTone ?? profile.preferredTone
  const hasChanges =
    (profile.userName ?? undefined) !== patch.userName ||
    (profile.userRole ?? undefined) !== patch.userRole ||
    profile.preferredTone !== nextPreferredTone ||
    (profile.deviceId ?? undefined) !== patch.deviceId

  if (!hasChanges) {
    return toPublicSettingsProfile(profile)
  }

  profile.userName = patch.userName
  profile.userRole = patch.userRole
  profile.preferredTone = nextPreferredTone
  profile.deviceId = patch.deviceId
  profile.syncVersion += 1

  await profile.save()

  return toPublicSettingsProfile(profile)
}
