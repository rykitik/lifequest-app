import { AppError } from '../../shared/errors/AppError.js'
import { getSettingsProfile, updateSettingsProfile } from '../settings/settings.service.js'
import type {
  SyncBootstrapCollections,
  SyncBootstrapConflict,
  SyncBootstrapResponse,
  SyncPullRequestBody,
  SyncPullResponse,
  SyncPushRequestBody,
  SyncPushResponse,
  SyncSettingsProfileEnvelope,
} from './sync.types.js'
import { SETTINGS_PROFILE_SYNC_ID, SYNC_SCHEMA_VERSION } from './sync.types.js'

function createEmptyCollections(): SyncBootstrapCollections {
  return {
    quests: [],
    todayRoute: [],
    progress: [],
    bodyLogs: [],
    moneyLogs: [],
    rescueLogs: [],
    companionProfile: [],
    settingsProfile: [],
    promptPreferences: [],
  }
}

function createBootstrapCursor(userId: string, serverTime: string) {
  return `bootstrap_${userId}_${serverTime}`
}

function createSettingsProfileEnvelope(profile: Awaited<ReturnType<typeof getSettingsProfile>>): SyncSettingsProfileEnvelope {
  return {
    id: SETTINGS_PROFILE_SYNC_ID,
    userId: profile.userId,
    userName: profile.userName,
    userRole: profile.userRole,
    preferredTone: profile.preferredTone,
    updatedAt: profile.updatedAt,
    syncVersion: profile.syncVersion,
    schemaVersion: SYNC_SCHEMA_VERSION,
  }
}

function assertSettingsOnlyCollectionKeys(collections: Record<string, unknown>) {
  const unsupportedKeys = Object.entries(collections)
    .filter(([key, value]) => key !== 'settingsProfile' && value != null)
    .filter(([, value]) => !Array.isArray(value) || value.length > 0)
    .map(([key]) => key)

  if (!unsupportedKeys.length) {
    return
  }

  throw new AppError('На этом этапе sync поддерживает только settingsProfile.', 400, {
    code: 'validation_error',
    details: {
      unsupportedKeys,
    },
  })
}

function createConflict(): SyncBootstrapConflict {
  return {
    collection: 'settingsProfile',
    entityId: SETTINGS_PROFILE_SYNC_ID,
    policy: 'last-write-wins',
    resolvedWith: 'server',
    reason: 'На сервере уже есть более новая версия settingsProfile. Сначала загрузите настройки с сервера.',
  }
}

export async function getSyncBootstrapState(userId: string): Promise<SyncBootstrapResponse> {
  const serverTime = new Date().toISOString()
  const settingsProfile = await getSettingsProfile(userId)

  return {
    userId,
    serverTime,
    latestSyncCursor: createBootstrapCursor(userId, serverTime),
    schemaVersion: SYNC_SCHEMA_VERSION,
    collections: {
      ...createEmptyCollections(),
      settingsProfile: [createSettingsProfileEnvelope(settingsProfile)],
    },
    conflicts: [],
  }
}

export async function pushSettingsProfileSync(
  authenticatedUserId: string,
  input: SyncPushRequestBody,
): Promise<SyncPushResponse> {
  if (input.userId !== authenticatedUserId) {
    throw new AppError('Нельзя отправить sync-пакет за другого пользователя.', 403, {
      code: 'forbidden',
    })
  }

  if (!input.deviceId?.trim()) {
    throw new AppError('Для sync push нужен deviceId.', 400, {
      code: 'validation_error',
    })
  }

  if (input.schemaVersion !== SYNC_SCHEMA_VERSION) {
    throw new AppError('Версия sync schema не поддерживается.', 400, {
      code: 'schema_mismatch',
    })
  }

  assertSettingsOnlyCollectionKeys(input.collections as Record<string, unknown>)

  const serverTime = new Date().toISOString()
  const latestSyncCursor = createBootstrapCursor(authenticatedUserId, serverTime)
  const incomingProfile = input.collections.settingsProfile?.[0]

  if (!incomingProfile) {
    return {
      serverTime,
      latestSyncCursor,
      accepted: {
        settingsProfile: [],
      },
      conflicts: [],
    }
  }

  if (incomingProfile.userId !== authenticatedUserId) {
    throw new AppError('settingsProfile содержит неверный userId.', 400, {
      code: 'validation_error',
    })
  }

  const currentServerProfile = await getSettingsProfile(authenticatedUserId)
  const currentServerUpdatedAt = new Date(currentServerProfile.updatedAt).getTime()
  const incomingUpdatedAt = new Date(incomingProfile.updatedAt).getTime()
  const incomingSyncVersion = incomingProfile.syncVersion ?? 0

  if (
    Number.isFinite(currentServerUpdatedAt) &&
    Number.isFinite(incomingUpdatedAt) &&
    incomingSyncVersion < currentServerProfile.syncVersion &&
    currentServerUpdatedAt > incomingUpdatedAt
  ) {
    return {
      serverTime,
      latestSyncCursor,
      accepted: {
        settingsProfile: [],
      },
      conflicts: [createConflict()],
    }
  }

  await updateSettingsProfile(authenticatedUserId, {
    userName: incomingProfile.userName,
    userRole: incomingProfile.userRole,
    preferredTone: incomingProfile.preferredTone,
    deviceId: incomingProfile.deviceId ?? input.deviceId,
    body: {
      userName: incomingProfile.userName,
      userRole: incomingProfile.userRole,
      preferredTone: incomingProfile.preferredTone,
      deviceId: incomingProfile.deviceId ?? input.deviceId,
    },
  })

  return {
    serverTime,
    latestSyncCursor,
    accepted: {
      settingsProfile: [SETTINGS_PROFILE_SYNC_ID],
    },
    conflicts: [],
  }
}

export async function pullSettingsProfileSync(
  authenticatedUserId: string,
  input: SyncPullRequestBody,
): Promise<SyncPullResponse> {
  if (input.userId !== authenticatedUserId) {
    throw new AppError('Нельзя запрашивать sync-пакет за другого пользователя.', 403, {
      code: 'forbidden',
    })
  }

  if (!input.deviceId?.trim()) {
    throw new AppError('Для sync pull нужен deviceId.', 400, {
      code: 'validation_error',
    })
  }

  if (
    Array.isArray(input.collections) &&
    input.collections.length > 0 &&
    input.collections.some((collection) => collection !== 'settingsProfile')
  ) {
    throw new AppError('На этом этапе sync pull поддерживает только settingsProfile.', 400, {
      code: 'validation_error',
    })
  }

  if (input.schemaVersion != null && input.schemaVersion !== SYNC_SCHEMA_VERSION) {
    throw new AppError('Версия sync schema не поддерживается.', 400, {
      code: 'schema_mismatch',
    })
  }

  const serverTime = new Date().toISOString()
  const latestSyncCursor = createBootstrapCursor(authenticatedUserId, serverTime)
  const settingsProfile = await getSettingsProfile(authenticatedUserId)
  const profileEnvelope = createSettingsProfileEnvelope(settingsProfile)
  const shouldReturnProfile =
    !input.since ||
    Number.isNaN(new Date(input.since).getTime()) ||
    new Date(settingsProfile.updatedAt).getTime() > new Date(input.since).getTime()

  return {
    serverTime,
    latestSyncCursor,
    changes: {
      settingsProfile: shouldReturnProfile ? [profileEnvelope] : [],
    },
    conflicts: [],
  }
}
