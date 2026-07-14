# HTTP Client Plan

## Цель

Зафиксировать будущую HTTP client архитектуру LifeQuest до backend skeleton и до подключения реальных API.

Сейчас приложение остаётся local-first MVP. Это значит:

- текущий UI не должен зависеть от доступности backend;
- `apiClient` не должен тайно включать auth/sync runtime раньше времени;
- все будущие сетевые контракты должны быть описаны заранее, чтобы backend и frontend сходились по одной модели.

Связанные документы:

- [auth-plan.md](./auth-plan.md)
- [sync-plan.md](./sync-plan.md)
- [client-sync-state-machine.md](./client-sync-state-machine.md)
- [sync-retry-policy.md](./sync-retry-policy.md)

## Цели HTTP client layer

- единый `apiClient` для backend requests;
- разделение public и protected запросов;
- корректный refresh flow без бесконечных циклов;
- typed errors вместо разрозненных исключений;
- idempotency keys для sync/reward операций;
- sync-обёртка для будущих push/pull/bootstrap сценариев;
- local-first UX не должен ломаться, если backend недоступен.

## Слои

### 1. Base axios instance

- один базовый экземпляр для URL, таймаутов, заголовков и `withCredentials`;
- не хранит access token сам по себе;
- не знает про Zustand напрямую;
- в текущем этапе не подключается к runtime.

### 2. Auth interceptor

- позже добавляет access token к protected requests;
- не должен срабатывать для local-only операций;
- не должен запускать refresh для самого `POST /api/auth/refresh`;
- не должен создавать refresh loop.

### 3. Refresh coordinator

- держит один активный refresh promise;
- синхронизирует конкурентные `401`;
- после success разрешает повтор protected requests;
- после fail возвращает единый `auth_expired` outcome.

### 4. Error normalizer

- переводит network/server/client ошибки в единый `ApiError`;
- нормализует `401/403/409/5xx/timeout/network`;
- делает ошибки пригодными для `useAuthStore`, `useSyncStore` и пользовательского UI.

### 5. Request idempotency helper

- генерирует idempotency key для sync/reward мутаций;
- нужен, чтобы повторные retry не создавали дубли и не начисляли XP дважды;
- позже будет использоваться вместе с queue и server-side deduplication.

### 6. Sync request wrapper

- изолирует `bootstrap / push / pull / import-local-backup`;
- добавляет типизированный request meta;
- умеет прокидывать `deviceId`, `userId`, `sync cursor`, `schemaVersion`;
- сейчас остаётся только контрактом и pure helper layer.

## Request categories

### 1. Public

Используются без access token:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/refresh`
- `GET /api/health`

Особенности:

- часть из них может требовать `withCredentials`, если задействован refresh cookie;
- `refresh` не должен участвовать в refresh-on-401 логике.

### 2. Protected

Требуют account session и access token в памяти:

- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/sync/bootstrap`
- `POST /api/sync/push`
- `POST /api/sync/pull`
- будущие domain APIs: quests, progress, body, money, rescue, companion, settings

Особенности:

- при `401` возможен controlled refresh flow;
- protected category делится на обычные account requests и sync requests, но оба класса требуют auth context.

### 3. Local-only

Вообще не ходят в backend:

- генерация prompt для внешнего ChatGPT через Центр промптов;
- local backup/export/import;
- PWA runtime и service worker recovery;
- device identity helper;
- demo reset / full local clear;
- текущее local-first состояние MVP.

Особенности:

- эти операции не должны зависеть от auth/sync backend;
- ошибки здесь остаются локальными и не переводят приложение в auth/sync failure state.

## HttpClientMode

Будущий HTTP client может работать в трёх внутренних режимах:

- `local_only` — backend integration не активна, local-first UX остаётся единственным источником поведения;
- `public` — доступны только public auth/health requests;
- `protected` — есть account session и можно выполнять protected/sync/domain requests.

Это внутренняя модель клиента, а не пользовательский UI-режим.

## Refresh race handling

Если несколько protected запросов одновременно получили `401`:

1. Первый запрос инициирует refresh.
2. Refresh coordinator сохраняет один shared refresh promise.
3. Остальные запросы не запускают новые refresh-вызовы, а ждут этот promise.
4. Если refresh успешен:
   - access token в памяти обновляется;
   - ожидающие запросы повторяются один раз с новым access token.
5. Если refresh не удался:
   - все ожидающие запросы получают `auth_expired`;
   - `useAuthStore` переводится в account expired / logout recovery flow;
   - local data при этом не удаляются автоматически.

Дополнительные правила:

- `POST /api/auth/refresh` никогда не должен триггерить refresh сам для себя;
- один и тот же failed protected request не должен бесконечно перезапускаться;
- logout очищает memory access token и account state, но не удаляет local data без явного решения пользователя.

## Error model

### ApiErrorCode

- `network_error`
- `timeout`
- `unauthorized`
- `forbidden`
- `validation_error`
- `conflict`
- `schema_mismatch`
- `server_error`
- `unknown_error`
- `auth_expired`
- `sync_conflict`

### Правила маршрутизации ошибок

#### Пользовательский UI

Показывать понятным языком:

- `network_error`
- `timeout`
- `validation_error`
- `conflict`
- `server_error`
- `auth_expired`
- `sync_conflict`

Не показывать как страшный crash:

- `unauthorized` и `forbidden` без account UI;
- технические `schema_mismatch`, если можно мягко перевести в recovery/reset flow.

#### useAuthStore

Передавать в auth state:

- `unauthorized`
- `forbidden`
- `auth_expired`
- часть `network_error`/`timeout`, если они сломали login/refresh/me flow

#### useSyncStore

Передавать в sync state:

- `network_error`
- `timeout`
- `conflict`
- `sync_conflict`
- `schema_mismatch`
- `server_error`, если он относится к `bootstrap/push/pull/import-local-backup`

### Retryable / non-retryable

Retryable:

- `network_error`
- `timeout`
- часть `server_error` (`5xx`)

Non-retryable:

- `validation_error`
- `forbidden`
- `schema_mismatch`
- `auth_expired`

Special handling:

- `unauthorized` обычно ведёт не к обычному retry, а к refresh decision;
- `sync_conflict` ведёт в conflict flow, а не в blind retry;
- `conflict` для обычных domain mutations может требовать ручного UI-решения позже.

## Idempotency policy

Idempotency key обязателен для:

- `sync push` мутаций;
- reward / XP операций;
- migrate-local import, если backend later будет поддерживать безопасный повтор;
- чувствительных create/update/delete операций, которые могут повторно отправиться после retry.

Idempotency key должен включать достаточный минимум:

- `userId`
- `deviceId`
- `entityType`
- `entityId`
- `operation`
- `sourceId`, если есть event/reward источник

Если операция local-only, idempotency key не обязателен.

## Связь с local-first UX

Пока backend не реализован:

- `apiClient` не должен выполнять реальные auth/sync/domain запросы;
- local mode остаётся основным рабочим режимом;
- ошибки будущего HTTP client слоя не должны ломать экран `Сегодня`, `План`, `Настройки` и backup flow;
- `ry-kit.ru` остаётся публичной web/PWA точкой входа, но пользовательские данные всё ещё локальны на устройстве.

## Связь с будущими stores

### useAuthStore later

HTTP client later будет:

- получать access token из memory auth state;
- отправлять `auth_expired`, `unauthorized`, `forbidden` в auth flow;
- запускать controlled logout/account expired recovery.

### useSyncStore later

HTTP client later будет:

- использовать queue + `deviceId`;
- отправлять retryable/non-retryable sync ошибки в sync state;
- передавать conflicts в `useSyncStore`;
- записывать `latestSyncCursor` и `lastSyncAt`.

## Что не делать на текущем этапе

- не подключать axios interceptors к runtime;
- не добавлять реальные backend calls;
- не делать auth gating для текущего MVP;
- не переводить Prompt Center, backup или reset на сетевые зависимости;
- не хранить access token в `localStorage`;
- не позволять refresh endpoint запускать бесконечный refresh loop.
