# Sync Plan

## Цель

Подготовить LifeQuest к будущей синхронизации между устройствами и аккаунтами, не ломая текущий local-first MVP.

Сейчас sync runtime всё ещё не реализован полностью. На текущем этапе уже существует безопасный `GET /api/sync/bootstrap`, а также первый реальный sync-домен `settingsProfile`, который синхронизируется только вручную и не влияет на остальные local-first stores.

Связанные документы:

- [client-sync-state-machine.md](/C:/Users/user/Downloads/projects/lifequest/docs/client-sync-state-machine.md)
- [sync-retry-policy.md](/C:/Users/user/Downloads/projects/lifequest/docs/sync-retry-policy.md)

## Режимы

### Local mode

- приложение работает без аккаунта;
- данные хранятся локально на устройстве;
- backup/export-import остаётся главным способом сохранения;
- `userId` может отсутствовать.

### Account mode

- пользователь логинится или регистрируется;
- сервер получает роль backup/source of truth;
- локальное хранилище остаётся cache/offline-слоем;
- все sync-сущности уже имеют `userId`.

### Offline cache

- даже после появления аккаунта UX остаётся local-first;
- локальные изменения применяются сразу;
- синхронизация отправляет изменения позже;
- если сеть недоступна, клиент продолжает писать локально и использует sync queue позже.

### Migration local → account

1. Пользователь жил в local mode.
2. Пользователь создаёт аккаунт.
3. Клиент отправляет local snapshot или backup на `POST /api/sync/import-local-backup`.
4. Сервер создаёт сущности с `userId`.
5. Клиент получает bootstrap и переключается в account mode.

## Основной принцип

- local-first UX всегда важнее ощущения «ожидания сервера»;
- после логина сервер становится backup/source of truth, но не ломает офлайн-работу;
- локальные изменения применяются оптимистично;
- позднее добавляется sync queue для надёжной отправки batched изменений;
- протокол должен поддерживать миграцию без потери текущих local данных.

## Sync endpoints

- `GET /api/sync/bootstrap`
- `POST /api/sync/push`
- `POST /api/sync/pull`
- `POST /api/sync/import-local-backup`

### Что уже реализовано сейчас

- `GET /api/sync/bootstrap`
- protected через auth access token
- возвращает typed bootstrap response
- пока не применяет серверные данные к local stores
- пока не запускает push/pull и не активирует conflict resolution UI
- `GET /api/settings/profile` создаёт default profile для account mode, если его ещё нет
- `PUT /api/settings/profile` вручную сохраняет только `userName`, `userRole`, `preferredTone`
- frontend умеет вручную загружать и сохранять `settingsProfile` из `Настроек`

## Что синхронизируется

- quests
- today route
- progress
- body logs
- money logs
- rescue logs
- companion profile
- settings profile
- prompt preferences, если они сохраняются как пользовательские настройки

## Что не синхронизируется

- transient UI state
- open modals
- temporary generated prompt preview
- service worker caches
- sessionStorage

## Payload format

Каждая sync-сущность должна иметь:

- `id`
- `userId`
- `updatedAt`
- `deletedAt?`
- `localUpdatedAt?`
- `syncVersion?`
- `deviceId?`
- `schemaVersion?`

TypeScript-like схема:

```ts
type SyncCollectionKey =
  | 'quests'
  | 'todayRoute'
  | 'progress'
  | 'bodyLogs'
  | 'moneyLogs'
  | 'rescueLogs'
  | 'companionProfile'
  | 'settingsProfile'
  | 'promptPreferences'

interface SyncEntityMeta {
  id: string
  userId: string
  updatedAt: string
  deletedAt?: string | null
  localUpdatedAt?: string | null
  syncVersion?: number
  deviceId?: string
  schemaVersion?: number
}

type SyncEnvelope<T> = T & SyncEntityMeta

interface SyncCollections {
  quests?: Array<SyncEnvelope<Quest>>
  todayRoute?: Array<SyncEnvelope<DailyRoute>>
  progress?: Array<SyncEnvelope<ProgressProfile>>
  bodyLogs?: Array<SyncEnvelope<BodyLog>>
  moneyLogs?: Array<SyncEnvelope<MoneyLog>>
  rescueLogs?: Array<SyncEnvelope<RescueLog>>
  companionProfile?: Array<SyncEnvelope<CompanionProfile>>
  settingsProfile?: Array<SyncEnvelope<SettingsProfile>>
  promptPreferences?: Array<SyncEnvelope<PromptPreferences>>
}

interface SyncBootstrapCollections {
  quests: Array<SyncEnvelope<Quest>>
  todayRoute: Array<SyncEnvelope<DailyRoute>>
  progress: Array<SyncEnvelope<ProgressProfile>>
  bodyLogs: Array<SyncEnvelope<BodyLog>>
  moneyLogs: Array<SyncEnvelope<MoneyLog>>
  rescueLogs: Array<SyncEnvelope<RescueLog>>
  companionProfile: Array<SyncEnvelope<CompanionProfile>>
  settingsProfile: Array<SyncEnvelope<SettingsProfile>>
  promptPreferences: Array<SyncEnvelope<PromptPreferences>>
}

interface SyncBootstrapResponse {
  userId: string
  deviceId?: string
  serverTime: string
  latestSyncCursor?: string
  schemaVersion: number
  collections: SyncBootstrapCollections
  conflicts: SyncConflict[]
}

interface SyncPushRequest {
  userId: string
  deviceId: string
  since?: string | null
  schemaVersion: number
  collections: SyncCollections
}

interface SyncPushResponse {
  serverTime: string
  latestSyncCursor?: string
  accepted: Partial<Record<SyncCollectionKey, string[]>>
  conflicts: SyncConflict[]
}

interface SyncPullRequest {
  userId: string
  deviceId: string
  since?: string | null
  collections?: SyncCollectionKey[]
  schemaVersion?: number
}

interface SyncPullResponse {
  serverTime: string
  latestSyncCursor?: string
  changes: SyncCollections
  conflicts: SyncConflict[]
}

interface ImportLocalBackupRequest {
  userId: string
  deviceId: string
  backupVersion: number
  exportedAt: string
  appVersion?: string
  schemaVersion?: number
  data: Record<string, string>
}

type SyncConflictPolicy =
  | 'last-write-wins'
  | 'merge-fields'
  | 'max-value-wins'
  | 'completed-wins'
  | 'tombstone-wins'
  | 'manual-review'

interface SyncConflict {
  collection: SyncCollectionKey
  entityId: string
  policy: SyncConflictPolicy
  local?: SyncEntityMeta
  server?: SyncEntityMeta
  resolvedWith: 'local' | 'server' | 'merged' | 'manual'
  reason: string
}
```

## Conflict policy

### 1. По умолчанию

- базовое правило: `last-write-wins` по `updatedAt`.

### 2. Progress

- `totalXp` не должен случайно уменьшаться;
- пока policy = `max(local, server)` для `totalXp`;
- sector XP тоже не должен уменьшаться без явного reset;
- в будущем лучше перейти на event-based reward log, но не в текущем этапе.

### 3. Completed quests

- `done` имеет приоритет над `todo`, если `updatedAt` близкие;
- награда не должна начисляться повторно;
- повторный reward later должен отсекаться по `sourceId`/event log.

### 4. Settings

- `last-write-wins`.

### 5. Money logs и body logs

- primary conflict key = `date`;
- если заполнены разные поля, сервер может merge fields;
- если конфликтует одно и то же поле, newer `updatedAt` wins.

### 6. Deleted entities

- удаление идёт через tombstone: `deletedAt`;
- физическое удаление выполняется позже после retention window;
- tombstone важнее старой не-удалённой версии, если timestamps не противоречат явно.

## Практический flow синхронизации

### Bootstrap

- клиент логинится;
- получает актуальный серверный снапшот;
- на текущем этапе bootstrap только проверяет связь и не перезаписывает local-first данные;
- локальный cache остаётся доступным для offline UX.

### Push

- клиент отправляет локальные изменения после `since`;
- сервер принимает часть изменений, а конфликты возвращает явно;
- клиент сохраняет новый sync cursor.

### Pull

- клиент запрашивает изменения с сервера после `since`;
- сервер отдаёт дельту и возможные конфликты;
- клиент обновляет локальный cache без полного сброса состояния.

### Import local backup

- используется при миграции из local mode в account mode;
- сервер импортирует только безопасные `lifequest-*` данные;
- после импорта клиент делает bootstrap и работает дальше уже как account-backed cache.

## Связь с клиентской state machine

- состояния клиента и переходы описаны в [client-sync-state-machine.md](/C:/Users/user/Downloads/projects/lifequest/docs/client-sync-state-machine.md)
- retry и pause/resume правила описаны в [sync-retry-policy.md](/C:/Users/user/Downloads/projects/lifequest/docs/sync-retry-policy.md)

## Ограничения до backend skeleton

- не писать backend заранее;
- не внедрять auth-gating UI;
- не ломать текущий solo/local-first опыт;
- сначала утвердить этот protocol, потом начинать server modules.

## Текущий runtime-этап

- `Settings` в account mode умеют запускать ручную проверку синхронизации;
- bootstrap обновляет только `latestSyncCursor`, `lastSyncAt`, `conflicts`, `lastError` и статус readiness;
- `settingsProfile` можно отдельно загрузить с сервера и отдельно сохранить в аккаунт;
- quests, today route, progress, body, money и другие local stores пока не перезаписываются сервером;
- push/pull и import-local-backup остаются следующими этапами.
