import { getLocalDateKey } from '@/shared/lib/date'

export const LIFEQUEST_BACKUP_APP_NAME = 'LifeQuest'
export const LIFEQUEST_BACKUP_VERSION = 2
export const BACKUP_REMINDER_SNOOZE_MS = 24 * 60 * 60 * 1000
const BACKUP_STALE_MS = 7 * BACKUP_REMINDER_SNOOZE_MS

export const LIFEQUEST_BACKUP_STORAGE_KEYS = [
  'lifequest-auth',
  'lifequest-quests',
  'lifequest-today',
  'lifequest-progress',
  'lifequest-body',
  'lifequest-money',
  'lifequest-companion',
  'lifequest-prompt-center',
  'lifequest-weekly-reviews',
  'lifequest-milestones',
  'lifequest-settings',
  'lifequest-sync',
  'lifequest-device-id',
] as const

export type LifeQuestBackupReason =
  | 'never_created'
  | 'useful_action'
  | 'money_import_completed'
  | 'weekly_review_saved'
  | 'onboarding_completed'
  | 'stale_backup'
  | 'local_data_grew'

interface LifeQuestBackupDataShape {
  [key: string]: string
}

export interface LifeQuestBackupPayload {
  app: typeof LIFEQUEST_BACKUP_APP_NAME
  appName: typeof LIFEQUEST_BACKUP_APP_NAME
  backupVersion: number
  exportedAt: string
  appVersion: string
  keysCount: number
  data: LifeQuestBackupDataShape
}

export interface LifeQuestBackupPreview {
  backup: LifeQuestBackupPayload
  exportedAtLabel: string
  sections: string[]
  keysCount: number
}

export type LifeQuestBackupValidationResult =
  | {
      valid: true
      backup: LifeQuestBackupPayload
      preview: LifeQuestBackupPreview
    }
  | {
      valid: false
      error: string
    }

export interface LifeQuestBackupExportResult {
  backup: LifeQuestBackupPayload
  fileName: string
}

export interface LifeQuestBackupImportResult {
  backup: LifeQuestBackupPayload
  importedKeys: string[]
  applied: boolean
  preview: LifeQuestBackupPreview
}

export interface BackupReminderStatus {
  active: boolean
  reason: LifeQuestBackupReason | null
  title: string
  message: string
}

export const backupFeedbackMessages = {
  created: 'Резервная копия создана.',
  protected: 'База защищена.',
  reminderTitle: 'Защита данных',
  reminderMessage: 'Локальная база уже содержит прогресс. Сохрани backup.',
  settingsNote: 'Файл содержит ваши локальные данные. Храните его в безопасном месте.',
} as const

const backupSectionLabels: Record<string, string> = {
  'lifequest-auth': 'Аккаунт',
  'lifequest-quests': 'План',
  'lifequest-today': 'Сегодня',
  'lifequest-progress': 'Прогресс',
  'lifequest-body': 'Тело',
  'lifequest-money': 'Деньги',
  'lifequest-companion': 'Ядро',
  'lifequest-prompt-center': 'Центр промптов',
  'lifequest-weekly-reviews': 'Недельные итоги',
  'lifequest-milestones': 'Вехи системы',
  'lifequest-settings': 'Настройки',
  'lifequest-sync': 'Готовность синхронизации',
  'lifequest-device-id': 'Устройство',
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isLifeQuestStorageKey(key: string) {
  return key.startsWith('lifequest-')
}

function getStorage(storage?: Storage) {
  const candidate = storage ?? globalThis.localStorage ?? globalThis.window?.localStorage

  if (!candidate) {
    throw new Error('Локальное хранилище недоступно.')
  }

  return candidate
}

function getStorageKeys(storage: Storage) {
  const keys: string[] = []

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)

    if (key) {
      keys.push(key)
    }
  }

  return keys
}

function buildBackupFileName(exportedAt: string) {
  return `lifequest-backup-${getLocalDateKey(new Date(exportedAt))}.json`
}

function formatBackupPreviewDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Дата неизвестна'
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getLifeQuestLocalStorageSnapshot(storage: Storage) {
  return getStorageKeys(storage)
    .filter(isLifeQuestStorageKey)
    .sort()
    .reduce<LifeQuestBackupDataShape>((snapshot, key) => {
      snapshot[key] = storage.getItem(key) ?? ''
      return snapshot
    }, {})
}

function triggerBackupDownload(fileName: string, json: string) {
  const blob = new Blob([json], { type: 'application/json' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  link.style.display = 'none'

  document.body.append(link)
  link.click()
  link.remove()

  window.setTimeout(() => {
    window.URL.revokeObjectURL(url)
  }, 0)
}

function normalizeBackupData(data: Record<string, unknown>) {
  const normalizedData = Object.entries(data).reduce<LifeQuestBackupDataShape>((result, [key, value]) => {
    if (isLifeQuestStorageKey(key) && typeof value === 'string') {
      result[key] = value
    }

    return result
  }, {})

  const hasInvalidKeys = Object.entries(data).some(
    ([key, value]) => !isLifeQuestStorageKey(key) || typeof value !== 'string',
  )

  return {
    normalizedData,
    hasInvalidKeys,
  }
}

function withRestoredSettingsBackupMetadata(data: LifeQuestBackupDataShape, exportedAt: string) {
  const settingsValue = data['lifequest-settings']

  if (!settingsValue) {
    return data
  }

  try {
    const parsedSettings = JSON.parse(settingsValue) as unknown

    if (!isPlainObject(parsedSettings) || !isPlainObject(parsedSettings.state)) {
      return data
    }

    return {
      ...data,
      'lifequest-settings': JSON.stringify({
        ...parsedSettings,
        state: {
          ...parsedSettings.state,
          lastBackupExportAt: exportedAt,
          lastBackupAt: exportedAt,
          lastBackupReminderDismissedAt: exportedAt,
          lastBackupReason: null,
          backupReminderSnoozedUntil: null,
        },
      }),
    }
  } catch {
    return data
  }
}

export function getLifeQuestBackupSections(data: LifeQuestBackupDataShape) {
  const sections = Object.keys(data)
    .map((key) => backupSectionLabels[key] ?? (isLifeQuestStorageKey(key) ? 'Локальные данные' : null))
    .filter((label): label is string => Boolean(label))

  return [...new Set(sections)]
}

export function createLifeQuestBackupPayload(options: { now?: Date; storage?: Storage } = {}) {
  const exportedAt = (options.now ?? new Date()).toISOString()
  const data = getLifeQuestLocalStorageSnapshot(getStorage(options.storage))
  const keysCount = Object.keys(data).length

  return {
    app: LIFEQUEST_BACKUP_APP_NAME,
    appName: LIFEQUEST_BACKUP_APP_NAME,
    backupVersion: LIFEQUEST_BACKUP_VERSION,
    exportedAt,
    appVersion: __APP_VERSION__,
    keysCount,
    data,
  } satisfies LifeQuestBackupPayload
}

export function createLifeQuestBackupPreview(backup: LifeQuestBackupPayload): LifeQuestBackupPreview {
  const keysCount = Object.keys(backup.data).length

  return {
    backup: {
      ...backup,
      keysCount,
    },
    exportedAtLabel: formatBackupPreviewDate(backup.exportedAt),
    sections: getLifeQuestBackupSections(backup.data),
    keysCount,
  }
}

export function validateLifeQuestBackup(payload: unknown): LifeQuestBackupValidationResult {
  if (!isPlainObject(payload)) {
    return {
      valid: false,
      error: 'Файл backup повреждён: ожидается JSON-объект.',
    }
  }

  const appName = payload.app ?? payload.appName

  if (appName !== LIFEQUEST_BACKUP_APP_NAME) {
    return {
      valid: false,
      error: 'Этот backup не относится к LifeQuest.',
    }
  }

  if (typeof payload.backupVersion !== 'number' || !Number.isFinite(payload.backupVersion)) {
    return {
      valid: false,
      error: 'В backup отсутствует корректная версия формата.',
    }
  }

  if (!isPlainObject(payload.data)) {
    return {
      valid: false,
      error: 'В backup отсутствует блок локальных данных.',
    }
  }

  const { normalizedData, hasInvalidKeys } = normalizeBackupData(payload.data)

  if (hasInvalidKeys) {
    return {
      valid: false,
      error: 'Backup содержит неизвестные данные и не будет применён автоматически.',
    }
  }

  if (!Object.keys(normalizedData).length) {
    return {
      valid: false,
      error: 'В backup нет данных LifeQuest для восстановления.',
    }
  }

  const backup: LifeQuestBackupPayload = {
    app: LIFEQUEST_BACKUP_APP_NAME,
    appName: LIFEQUEST_BACKUP_APP_NAME,
    backupVersion: payload.backupVersion,
    exportedAt: typeof payload.exportedAt === 'string' ? payload.exportedAt : '',
    appVersion: typeof payload.appVersion === 'string' ? payload.appVersion : '',
    keysCount: Object.keys(normalizedData).length,
    data: normalizedData,
  }

  return {
    valid: true,
    backup,
    preview: createLifeQuestBackupPreview(backup),
  }
}

export function parseLifeQuestBackupText(rawText: string) {
  let parsedPayload: unknown

  try {
    parsedPayload = JSON.parse(rawText)
  } catch {
    throw new Error('Файл backup содержит невалидный JSON.')
  }

  const validationResult = validateLifeQuestBackup(parsedPayload)

  if (!validationResult.valid) {
    throw new Error(validationResult.error)
  }

  return validationResult.preview
}

export function exportLifeQuestBackup(): LifeQuestBackupExportResult {
  const backup = createLifeQuestBackupPayload()
  const fileName = buildBackupFileName(backup.exportedAt)
  const json = JSON.stringify(backup, null, 2)

  triggerBackupDownload(fileName, json)

  return {
    backup,
    fileName,
  }
}

export function applyLifeQuestBackup(backup: LifeQuestBackupPayload, storage?: Storage) {
  const targetStorage = getStorage(storage)
  const restoredData = withRestoredSettingsBackupMetadata(backup.data, backup.exportedAt)
  const importedKeys = Object.keys(restoredData)

  getStorageKeys(targetStorage)
    .filter(isLifeQuestStorageKey)
    .forEach((key) => targetStorage.removeItem(key))

  importedKeys.forEach((key) => {
    const value = restoredData[key]

    if (typeof value === 'string') {
      targetStorage.setItem(key, value)
    }
  })

  return importedKeys
}

export async function importLifeQuestBackup(
  file: File,
  options: { apply?: boolean } = {},
): Promise<LifeQuestBackupImportResult> {
  if (!(file instanceof File)) {
    throw new Error('Файл backup не выбран.')
  }

  let rawText: string
  try {
    rawText = await file.text()
  } catch {
    throw new Error('Не удалось прочитать файл backup.')
  }

  const preview = parseLifeQuestBackupText(rawText)
  const importedKeys = Object.keys(preview.backup.data)

  if (options.apply === false) {
    return {
      backup: preview.backup,
      importedKeys,
      applied: false,
      preview,
    }
  }

  applyLifeQuestBackup(preview.backup)

  return {
    backup: preview.backup,
    importedKeys,
    applied: true,
    preview,
  }
}

export function getLifeQuestLocalDataSummary(storage?: Storage) {
  const data = getLifeQuestLocalStorageSnapshot(getStorage(storage))
  const keys = Object.keys(data)

  return {
    keys,
    keysCount: keys.length,
    sections: getLifeQuestBackupSections(data),
    hasValuableLocalData: keys.some((key) => key !== 'lifequest-settings' && key !== 'lifequest-auth'),
  }
}

function parseDateTime(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const timestamp = new Date(value).getTime()

  return Number.isNaN(timestamp) ? null : timestamp
}

export function getBackupReminderStatus(input: {
  lastBackupAt?: string | null
  lastBackupExportAt?: string | null
  lastBackupReason?: LifeQuestBackupReason | null
  backupReminderSnoozedUntil?: string | null
  now?: Date
  localDataKeysCount?: number
  hasValuableLocalData?: boolean
}): BackupReminderStatus {
  const now = input.now ?? new Date()
  const nowTime = now.getTime()
  const snoozedUntil = parseDateTime(input.backupReminderSnoozedUntil)

  if (snoozedUntil && snoozedUntil > nowTime) {
    return {
      active: false,
      reason: null,
      title: backupFeedbackMessages.reminderTitle,
      message: '',
    }
  }

  const lastBackupTime = parseDateTime(input.lastBackupAt ?? input.lastBackupExportAt)
  const localDataKeysCount = input.localDataKeysCount ?? 1
  const hasValuableLocalData = input.hasValuableLocalData ?? true
  let reason: LifeQuestBackupReason | null = null

  if (!lastBackupTime && hasValuableLocalData) {
    reason = 'never_created'
  } else if (input.lastBackupReason) {
    reason = input.lastBackupReason
  } else if (lastBackupTime && nowTime - lastBackupTime >= BACKUP_STALE_MS) {
    reason = 'stale_backup'
  } else if (lastBackupTime && localDataKeysCount >= 6 && nowTime - lastBackupTime >= BACKUP_REMINDER_SNOOZE_MS) {
    reason = 'local_data_grew'
  }

  if (!reason) {
    return {
      active: false,
      reason: null,
      title: backupFeedbackMessages.reminderTitle,
      message: '',
    }
  }

  return {
    active: true,
    reason,
    title: backupFeedbackMessages.reminderTitle,
    message:
      reason === 'stale_backup'
        ? 'Прошло больше недели с последнего backup. Обновление займёт несколько секунд.'
        : backupFeedbackMessages.reminderMessage,
  }
}
