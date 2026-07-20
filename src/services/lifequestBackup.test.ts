import { describe, expect, it } from 'vitest'
import {
  BACKUP_REMINDER_SNOOZE_MS,
  LIFEQUEST_BACKUP_VERSION,
  backupFeedbackMessages,
  applyLifeQuestBackup,
  createLifeQuestBackupPayload,
  getBackupReminderStatus,
  getLifeQuestBackupSections,
  parseLifeQuestBackupText,
} from '@/services/lifequestBackup'

class MemoryStorage implements Storage {
  private items = new Map<string, string>()

  get length() {
    return this.items.size
  }

  clear() {
    this.items.clear()
  }

  getItem(key: string) {
    return this.items.get(key) ?? null
  }

  key(index: number) {
    return Array.from(this.items.keys())[index] ?? null
  }

  removeItem(key: string) {
    this.items.delete(key)
  }

  setItem(key: string, value: string) {
    this.items.set(key, value)
  }
}

function createStorageSnapshot() {
  const storage = new MemoryStorage()

  storage.setItem('lifequest-settings', '{"state":{"userName":"Иван"}}')
  storage.setItem('lifequest-body', '{"state":{"logs":[]}}')
  storage.setItem('lifequest-money', '{"state":{"transactions":[]}}')
  storage.setItem('lifequest-milestones', '{"state":{"milestones":[]}}')
  storage.setItem('lifequest-weekly-reviews', '{"state":{"summaries":[]}}')
  storage.setItem('unrelated-key', 'outside')

  return storage
}

describe('lifequest backup export model', () => {
  it('export включает expected lifequest keys и игнорирует внешние ключи', () => {
    const backup = createLifeQuestBackupPayload({
      storage: createStorageSnapshot(),
      now: new Date('2026-07-17T10:00:00.000Z'),
    })

    expect(Object.keys(backup.data)).toEqual([
      'lifequest-body',
      'lifequest-milestones',
      'lifequest-money',
      'lifequest-settings',
      'lifequest-weekly-reviews',
    ])
    expect(backup.data).not.toHaveProperty('unrelated-key')
  })

  it('export добавляет metadata backup-файла', () => {
    const backup = createLifeQuestBackupPayload({
      storage: createStorageSnapshot(),
      now: new Date('2026-07-17T10:00:00.000Z'),
    })

    expect(backup).toMatchObject({
      app: 'LifeQuest',
      appName: 'LifeQuest',
      backupVersion: LIFEQUEST_BACKUP_VERSION,
      exportedAt: '2026-07-17T10:00:00.000Z',
      keysCount: 5,
    })
    expect(typeof backup.appVersion).toBe('string')
  })

  it('import reject invalid JSON', () => {
    expect(() => parseLifeQuestBackupText('{broken')).toThrow('невалидный JSON')
  })

  it('import reject non-LifeQuest backup', () => {
    expect(() =>
      parseLifeQuestBackupText(
        JSON.stringify({
          app: 'Other',
          backupVersion: 1,
          data: {
            'lifequest-settings': '{}',
          },
        }),
      ),
    ).toThrow('не относится к LifeQuest')
  })

  it('import preview распознаёт sections', () => {
    const backup = createLifeQuestBackupPayload({
      storage: createStorageSnapshot(),
      now: new Date('2026-07-17T10:00:00.000Z'),
    })
    const preview = parseLifeQuestBackupText(JSON.stringify(backup))

    expect(preview.sections).toEqual(['Тело', 'Вехи системы', 'Деньги', 'Настройки', 'Недельные итоги'])
    expect(preview.keysCount).toBe(5)
  })

  it('import apply обновляет backup metadata в восстановленных settings', () => {
    const backup = createLifeQuestBackupPayload({
      storage: createStorageSnapshot(),
      now: new Date('2026-07-17T10:00:00.000Z'),
    })
    const targetStorage = new MemoryStorage()

    applyLifeQuestBackup(backup, targetStorage)

    const restoredSettings = JSON.parse(targetStorage.getItem('lifequest-settings') ?? '{}') as {
      state?: Record<string, unknown>
    }

    expect(restoredSettings.state).toMatchObject({
      lastBackupAt: '2026-07-17T10:00:00.000Z',
      lastBackupExportAt: '2026-07-17T10:00:00.000Z',
      lastBackupReason: null,
    })
  })

  it('section preview не ломается на будущих lifequest-ключах', () => {
    expect(getLifeQuestBackupSections({ 'lifequest-future': '{}' })).toEqual(['Локальные данные'])
  })
})

describe('backup reminder model', () => {
  it('reminder показывается, если backup never done', () => {
    expect(
      getBackupReminderStatus({
        lastBackupAt: null,
        hasValuableLocalData: true,
      }),
    ).toMatchObject({
      active: true,
      reason: 'never_created',
    })
  })

  it('reminder не показывается, если backup свежий', () => {
    expect(
      getBackupReminderStatus({
        lastBackupAt: '2026-07-17T08:00:00.000Z',
        now: new Date('2026-07-17T10:00:00.000Z'),
        hasValuableLocalData: true,
      }).active,
    ).toBe(false)
  })

  it('reminder snooze скрывает его на 24 часа', () => {
    const dismissedAt = new Date('2026-07-17T10:00:00.000Z').getTime()
    const snoozedUntil = new Date(dismissedAt + BACKUP_REMINDER_SNOOZE_MS).toISOString()

    expect(
      getBackupReminderStatus({
        lastBackupAt: null,
        backupReminderSnoozedUntil: snoozedUntil,
        now: new Date('2026-07-17T12:00:00.000Z'),
        hasValuableLocalData: true,
      }).active,
    ).toBe(false)
  })

  it('старый backup снова активирует мягкое напоминание', () => {
    expect(
      getBackupReminderStatus({
        lastBackupAt: '2026-07-08T10:00:00.000Z',
        now: new Date('2026-07-17T10:00:00.000Z'),
        hasValuableLocalData: true,
      }),
    ).toMatchObject({
      active: true,
      reason: 'stale_backup',
    })
  })

  it('feedback text не содержит shame/fear wording', () => {
    expect(JSON.stringify(backupFeedbackMessages).toLowerCase()).not.toMatch(
      /стыд|провал|наказ|обязан|страх|паник|срочно|потеря/,
    )
  })
})
