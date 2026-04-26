export const SYNC_SCHEMA_VERSION = 1

export interface SyncBootstrapCollections {
  quests: unknown[]
  todayRoute: unknown[]
  progress: unknown[]
  bodyLogs: unknown[]
  moneyLogs: unknown[]
  rescueLogs: unknown[]
  companionProfile: unknown[]
  settingsProfile: unknown[]
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
