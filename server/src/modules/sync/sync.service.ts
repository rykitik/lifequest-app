import type { SyncBootstrapCollections, SyncBootstrapResponse } from './sync.types.js'
import { SYNC_SCHEMA_VERSION } from './sync.types.js'

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

export async function getSyncBootstrapState(userId: string): Promise<SyncBootstrapResponse> {
  const serverTime = new Date().toISOString()

  return {
    userId,
    serverTime,
    latestSyncCursor: createBootstrapCursor(userId, serverTime),
    schemaVersion: SYNC_SCHEMA_VERSION,
    collections: createEmptyCollections(),
    conflicts: [],
  }
}
