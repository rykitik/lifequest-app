import type { AuthMode } from '@/shared/types/domain'
import type { SyncCollectionKey, SyncConflict } from '@/shared/types/sync'

export type SyncStatus =
  | 'local_only'
  | 'idle'
  | 'bootstrapping'
  | 'syncing'
  | 'offline'
  | 'conflict'
  | 'error'

export type SyncEvent =
  | 'app_started'
  | 'user_logged_in'
  | 'user_logged_out'
  | 'local_change_created'
  | 'online_detected'
  | 'offline_detected'
  | 'sync_requested'
  | 'sync_success'
  | 'sync_failed'
  | 'conflict_detected'
  | 'import_completed'

export type SyncQueueOperation = 'create' | 'update' | 'delete' | 'complete' | 'reward'

export type SyncQueueItemStatus = 'pending' | 'syncing' | 'failed' | 'resolved'

export interface SyncQueueItem {
  id: string
  userId: string
  deviceId: string
  entityType: SyncCollectionKey
  entityId: string
  operation: SyncQueueOperation
  payload: unknown
  createdAt: string
  attempts: number
  lastAttemptAt?: string | null
  status: SyncQueueItemStatus
  idempotencyKey: string
}

export type SyncTriggerReason =
  | 'app_start'
  | 'manual'
  | 'local_change'
  | 'online_restored'
  | 'bootstrap'
  | 'import_completed'

export interface SyncRetryPolicy {
  initialDelayMs: number
  multiplier: number
  maxDelayMs: number
  maxAttempts: number
  retryableErrors: Array<'network' | 'timeout' | '5xx'>
  nonRetryableErrors: Array<'401' | '403' | '400' | 'schema_mismatch'>
}

export interface SyncClientState {
  mode: AuthMode
  status: SyncStatus
  userId: string | null
  deviceId: string | null
  latestSyncCursor?: string | null
  lastSyncAt?: string | null
  lastSuccessfulSyncAt?: string | null
  lastTriggerReason?: SyncTriggerReason | null
  queue: SyncQueueItem[]
  conflicts: SyncConflict[]
  networkOnline: boolean
  lastError?: string | null
  retryPolicy: SyncRetryPolicy
}
