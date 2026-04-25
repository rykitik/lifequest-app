import { getLocalDateKey } from '@/shared/lib/date'
import { clearAllLifeQuestLocalStorage } from '@/services/lifequestRuntime'

const LIFEQUEST_BACKUP_APP_NAME = 'LifeQuest'
const LIFEQUEST_BACKUP_VERSION = 1

interface LifeQuestBackupDataShape {
  [key: string]: string
}

export interface LifeQuestBackupPayload {
  appName: typeof LIFEQUEST_BACKUP_APP_NAME
  backupVersion: number
  exportedAt: string
  appVersion: string
  data: LifeQuestBackupDataShape
}

export type LifeQuestBackupValidationResult =
  | {
      valid: true
      backup: LifeQuestBackupPayload
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
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isLifeQuestStorageKey(key: string) {
  return key.startsWith('lifequest-')
}

function buildBackupFileName(exportedAt: string) {
  return `lifequest-backup-${getLocalDateKey(new Date(exportedAt))}.json`
}

function getLifeQuestLocalStorageSnapshot() {
  return Object.keys(window.localStorage)
    .filter(isLifeQuestStorageKey)
    .sort()
    .reduce<LifeQuestBackupDataShape>((snapshot, key) => {
      snapshot[key] = window.localStorage.getItem(key) ?? ''
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

export function validateLifeQuestBackup(payload: unknown): LifeQuestBackupValidationResult {
  if (!isPlainObject(payload)) {
    return {
      valid: false,
      error: 'Файл backup повреждён: ожидается JSON-объект.',
    }
  }

  if (payload.appName !== LIFEQUEST_BACKUP_APP_NAME) {
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

  const normalizedData = Object.entries(payload.data).reduce<LifeQuestBackupDataShape>(
    (result, [key, value]) => {
      if (isLifeQuestStorageKey(key) && typeof value === 'string') {
        result[key] = value
      }

      return result
    },
    {},
  )

  if (!Object.keys(normalizedData).length) {
    return {
      valid: false,
      error: 'В backup нет данных LifeQuest для восстановления.',
    }
  }

  return {
    valid: true,
    backup: {
      appName: LIFEQUEST_BACKUP_APP_NAME,
      backupVersion: payload.backupVersion,
      exportedAt: typeof payload.exportedAt === 'string' ? payload.exportedAt : '',
      appVersion: typeof payload.appVersion === 'string' ? payload.appVersion : '',
      data: normalizedData,
    },
  }
}

export function exportLifeQuestBackup(): LifeQuestBackupExportResult {
  const exportedAt = new Date().toISOString()
  const backup: LifeQuestBackupPayload = {
    appName: LIFEQUEST_BACKUP_APP_NAME,
    backupVersion: LIFEQUEST_BACKUP_VERSION,
    exportedAt,
    appVersion: __APP_VERSION__,
    data: getLifeQuestLocalStorageSnapshot(),
  }

  const fileName = buildBackupFileName(exportedAt)
  const json = JSON.stringify(backup, null, 2)

  triggerBackupDownload(fileName, json)

  return {
    backup,
    fileName,
  }
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

  const importedKeys = Object.keys(validationResult.backup.data)

  if (options.apply === false) {
    return {
      backup: validationResult.backup,
      importedKeys,
      applied: false,
    }
  }

  clearAllLifeQuestLocalStorage()

  importedKeys.forEach((key) => {
    const value = validationResult.backup.data[key]

    if (typeof value === 'string') {
      window.localStorage.setItem(key, value)
    }
  })

  return {
    backup: validationResult.backup,
    importedKeys,
    applied: true,
  }
}
