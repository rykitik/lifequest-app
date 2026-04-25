import type {
  BodyLog,
  CompanionProfile,
  DailyRoute,
  PreferredTone,
  ProgressProfile,
  Quest,
  RescueLog,
  SettingsProfile,
  MoneyLog,
} from '@/shared/types/domain'

export type SyncCollectionKey =
  | 'quests'
  | 'todayRoute'
  | 'progress'
  | 'bodyLogs'
  | 'moneyLogs'
  | 'rescueLogs'
  | 'companionProfile'
  | 'settingsProfile'
  | 'promptPreferences'

export interface SyncEntityMeta {
  id: string
  userId: string
  updatedAt: string
  deletedAt?: string | null
  localUpdatedAt?: string | null
  syncVersion?: number
  deviceId?: string
  schemaVersion?: number
}

export type SyncEnvelope<T> = T & SyncEntityMeta

export interface PromptPreferencesSyncPayload {
  id: string
  userId?: string
  selectedCardId: string | null
  preferredResponseFormat: string
  preferredTone?: PreferredTone
}

export interface SyncCollections {
  quests?: Array<SyncEnvelope<Quest>>
  todayRoute?: Array<SyncEnvelope<DailyRoute>>
  progress?: Array<SyncEnvelope<ProgressProfile>>
  bodyLogs?: Array<SyncEnvelope<BodyLog>>
  moneyLogs?: Array<SyncEnvelope<MoneyLog>>
  rescueLogs?: Array<SyncEnvelope<RescueLog>>
  companionProfile?: Array<SyncEnvelope<CompanionProfile>>
  settingsProfile?: Array<SyncEnvelope<SettingsProfile>>
  promptPreferences?: Array<SyncEnvelope<PromptPreferencesSyncPayload>>
}

export interface SyncBootstrapResponse {
  userId: string
  deviceId?: string
  serverTime: string
  latestSyncCursor?: string
  schemaVersion: number
  collections: SyncCollections
}

export interface SyncPushRequest {
  userId: string
  deviceId: string
  since?: string | null
  schemaVersion: number
  collections: SyncCollections
}

export interface SyncPushResponse {
  serverTime: string
  latestSyncCursor?: string
  accepted: Partial<Record<SyncCollectionKey, string[]>>
  conflicts: SyncConflict[]
}

export interface SyncPullRequest {
  userId: string
  deviceId: string
  since?: string | null
  collections?: SyncCollectionKey[]
  schemaVersion?: number
}

export interface SyncPullResponse {
  serverTime: string
  latestSyncCursor?: string
  changes: SyncCollections
  conflicts: SyncConflict[]
}

export interface ImportLocalBackupRequest {
  userId: string
  deviceId: string
  backupVersion: number
  exportedAt: string
  appVersion?: string
  schemaVersion?: number
  data: Record<string, string>
}

export type SyncConflictPolicy =
  | 'last-write-wins'
  | 'merge-fields'
  | 'max-value-wins'
  | 'completed-wins'
  | 'tombstone-wins'
  | 'manual-review'

export interface SyncConflict {
  collection: SyncCollectionKey
  entityId: string
  policy: SyncConflictPolicy
  local?: SyncEntityMeta
  server?: SyncEntityMeta
  resolvedWith: 'local' | 'server' | 'merged' | 'manual'
  reason: string
}
