import type { SyncCollectionKey } from '@/shared/types/sync'
import type {
  SyncQueueItem,
  SyncQueueOperation,
  SyncQueueItemStatus,
  SyncRetryPolicy,
} from '@/shared/types/syncState'

export interface CreateSyncQueueItemInput {
  userId: string
  deviceId: string
  entityType: SyncCollectionKey
  entityId: string
  operation: SyncQueueOperation
  payload: unknown
  createdAt: string
  id?: string
  idempotencyKey?: string
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue)
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = sortValue((value as Record<string, unknown>)[key])
        return accumulator
      }, {})
  }

  return value
}

function stableSerialize(value: unknown) {
  return JSON.stringify(sortValue(value))
}

function getPayloadSourceId(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const sourceId = (payload as Record<string, unknown>).sourceId
  return typeof sourceId === 'string' && sourceId.trim() ? sourceId.trim() : null
}

function createQueueItemId(input: CreateSyncQueueItemInput) {
  return `${input.entityType}:${input.entityId}:${input.operation}:${input.createdAt}`
}

export function createIdempotencyKey(input: CreateSyncQueueItemInput) {
  const sourceId = getPayloadSourceId(input.payload)

  if (sourceId) {
    return [
      input.userId,
      input.deviceId,
      input.entityType,
      input.entityId,
      input.operation,
      sourceId,
    ].join(':')
  }

  return [
    input.userId,
    input.deviceId,
    input.entityType,
    input.entityId,
    input.operation,
    input.createdAt,
    stableSerialize(input.payload),
  ].join(':')
}

export function createSyncQueueItem(input: CreateSyncQueueItemInput): SyncQueueItem {
  return {
    id: input.id ?? createQueueItemId(input),
    userId: input.userId,
    deviceId: input.deviceId,
    entityType: input.entityType,
    entityId: input.entityId,
    operation: input.operation,
    payload: input.payload,
    createdAt: input.createdAt,
    attempts: 0,
    lastAttemptAt: null,
    status: 'pending',
    idempotencyKey: input.idempotencyKey ?? createIdempotencyKey(input),
  }
}

function isRetryableStatus(status: SyncQueueItemStatus) {
  return status === 'pending' || status === 'failed'
}

export function shouldRetrySyncItem(item: SyncQueueItem, retryPolicy: SyncRetryPolicy) {
  return isRetryableStatus(item.status) && item.attempts < retryPolicy.maxAttempts
}

export function getNextRetryDelay(item: SyncQueueItem, retryPolicy: SyncRetryPolicy) {
  if (!shouldRetrySyncItem(item, retryPolicy)) {
    return null
  }

  const exponent = Math.max(item.attempts - 1, 0)
  const calculatedDelay = retryPolicy.initialDelayMs * retryPolicy.multiplier ** exponent

  return Math.min(calculatedDelay, retryPolicy.maxDelayMs)
}

export function filterPendingQueue(queue: SyncQueueItem[]) {
  return queue.filter((item) => item.status === 'pending')
}

export function filterFailedQueue(queue: SyncQueueItem[]) {
  return queue.filter((item) => item.status === 'failed')
}

export function filterResolvedQueue(queue: SyncQueueItem[]) {
  return queue.filter((item) => item.status === 'resolved')
}
