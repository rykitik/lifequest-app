import type { SettingsPreferredTone } from '../settings/settings.types.js'

export const SYNC_SCHEMA_VERSION = 1
export const SETTINGS_PROFILE_SYNC_ID = 'settings-profile'

export interface SyncSettingsProfileEnvelope {
  id: string
  userId: string
  userName: string
  userRole: string
  preferredTone: SettingsPreferredTone
  updatedAt: string
  deletedAt?: string | null
  localUpdatedAt?: string | null
  syncVersion?: number
  deviceId?: string
  schemaVersion?: number
}

export interface SyncBootstrapCollections {
  quests: unknown[]
  todayRoute: unknown[]
  progress: unknown[]
  bodyLogs: unknown[]
  moneyLogs: unknown[]
  rescueLogs: unknown[]
  companionProfile: unknown[]
  settingsProfile: SyncSettingsProfileEnvelope[]
  promptPreferences: unknown[]
}

export interface SyncBootstrapConflict {
  collection: string
  entityId: string
  policy: string
  resolvedWith: 'local' | 'server' | 'merged' | 'manual'
  reason: string
}

export interface SyncBootstrapResponse {
  userId: string
  serverTime: string
  latestSyncCursor: string
  schemaVersion: number
  collections: SyncBootstrapCollections
  conflicts: SyncBootstrapConflict[]
}

export interface SyncPushRequestBody {
  userId: string
  deviceId: string
  since?: string | null
  schemaVersion: number
  collections: {
    settingsProfile?: SyncSettingsProfileEnvelope[]
    [key: string]: unknown
  }
}

export interface SyncPushResponse {
  serverTime: string
  latestSyncCursor: string
  accepted: {
    settingsProfile: string[]
  }
  conflicts: SyncBootstrapConflict[]
}

export interface SyncPullRequestBody {
  userId: string
  deviceId: string
  since?: string | null
  collections?: string[]
  schemaVersion?: number
}

export interface SyncPullResponse {
  serverTime: string
  latestSyncCursor: string
  changes: {
    settingsProfile: SyncSettingsProfileEnvelope[]
  }
  conflicts: SyncBootstrapConflict[]
}
