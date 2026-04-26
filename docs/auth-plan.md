# Auth Plan

## Цель

Зафиксировать будущую auth-архитектуру LifeQuest до backend skeleton и до подключения реальных API.

Сейчас приложение остаётся usable без аккаунта. Auth должен появиться позже так, чтобы не сломать local-first MVP и позволить нескольким людям пользоваться своими аккаунтами и своими данными.

## Текущий backend milestone

На backend уже реализован минимальный auth foundation:

- `User model`;
- `register`;
- `login`;
- `refresh`;
- `logout`;
- `me`.

Важно:

- frontend пока не подключён к этим endpoint;
- local-first UX не меняется;
- `migrate-local` и sync runtime ещё не реализованы.

## Auth strategy

### Режимы

- local / anonymous mode
- account mode
- refreshing
- unauthenticated
- authenticated
- error

### Цели

- пользователь может пользоваться приложением без аккаунта;
- позже может создать аккаунт;
- после входа local data можно мигрировать в account;
- друзья смогут иметь свои аккаунты и свои данные;
- refresh token должен храниться в `httpOnly` cookie;
- access token живёт только в memory store, не в `localStorage`.

## Auth state machine

### Statuses

- `local`
- `unauthenticated`
- `authenticating`
- `authenticated`
- `refreshing`
- `logging_out`
- `error`

### Events

- `app_started`
- `continue_locally`
- `login_requested`
- `login_success`
- `login_failed`
- `register_requested`
- `register_success`
- `register_failed`
- `refresh_started`
- `refresh_success`
- `refresh_failed`
- `logout_requested`
- `logout_success`
- `migrate_local_requested`
- `migrate_local_success`
- `migrate_local_failed`

### Основные переходы

- `app_started -> local`, если нет account session
- `app_started -> refreshing`, если есть refresh cookie и пользователь раньше уже работал в account mode
- `refreshing -> authenticated` при `refresh_success`
- `refreshing -> local` или `unauthenticated` при `refresh_failed`
- `local -> authenticating` при `login_requested` или `register_requested`
- `authenticating -> authenticated` при `login_success` или `register_success`
- `authenticating -> error` при `login_failed` или `register_failed`
- `authenticated -> logging_out` при `logout_requested`
- `logging_out -> local` или `unauthenticated` при `logout_success`
- `authenticated -> error` при unrecoverable auth error

## Token / cookie policy

### Access token

- хранится только в memory;
- не записывается в `localStorage`;
- не записывается в `sessionStorage`;
- живёт коротко и переиздаётся через refresh flow.

### Refresh token

- хранится только в `httpOnly Secure SameSite` cookie;
- frontend не читает refresh token напрямую;
- frontend опирается только на success/fail ответа `POST /api/auth/refresh`.

### Frontend policy later

- axios interceptor позже будет добавлять access token к protected requests;
- при `401` interceptor сможет запускать `refresh`;
- если `refresh` не удался, клиент переходит в logout / account expired flow;
- CSRF нужно учесть позже для production cookie-based refresh.

## Endpoints

### POST /api/auth/register

Request:

```json
{
  "email": "user@example.com",
  "password": "string",
  "name": "Капитан"
}
```

Response:

```json
{
  "user": {
    "id": "usr_123",
    "userId": "usr_123",
    "email": "user@example.com",
    "name": "Капитан"
  },
  "session": {
    "mode": "account",
    "status": "authenticated"
  },
  "tokens": {
    "accessToken": "jwt",
    "expiresAt": "2026-04-25T12:00:00.000Z",
    "tokenType": "Bearer"
  }
}
```

Errors:

- `400 validation_error`
- `409 account_exists`
- `500 internal_error`

Клиент после success:

- сохраняет access token только в memory;
- переключает auth state в `authenticated`;
- предлагает мигрировать local data в account, если это релевантно.

Клиент после fail:

- остаётся в `local` или `error`;
- не ломает local-first доступ.

### POST /api/auth/login

Request:

```json
{
  "email": "user@example.com",
  "password": "string"
}
```

Response shape:

- тот же `AuthResponse`, что и у `register`

Errors:

- `400 validation_error`
- `401 invalid_credentials`
- `429 rate_limited`
- `500 internal_error`

Клиент после success:

- кладёт access token в memory store;
- переключается в `authenticated`;
- запускает bootstrap и затем optional migration prompt.

Клиент после fail:

- остаётся usable локально;
- показывает понятную ошибку позже через auth UI.

### POST /api/auth/refresh

Request:

- body может быть пустым;
- refresh token приходит только через cookie.

Response:

```json
{
  "tokens": {
    "accessToken": "jwt",
    "expiresAt": "2026-04-25T12:00:00.000Z",
    "tokenType": "Bearer"
  },
  "session": {
    "mode": "account",
    "status": "authenticated"
  }
}
```

Errors:

- `401 refresh_expired`
- `403 forbidden`
- `500 internal_error`

Клиент после success:

- обновляет memory access token;
- возвращается в `authenticated`.

Клиент после fail:

- сбрасывает memory token;
- уходит в `local` или `unauthenticated`;
- не удаляет local-first данные автоматически.

### POST /api/auth/logout

Request:

- access token в `Authorization`
- refresh cookie очищается сервером

Response:

```json
{
  "success": true,
  "mode": "local"
}
```

Errors:

- `401 unauthorized`
- `500 internal_error`

Клиент после success:

- очищает memory token;
- прекращает account session;
- возвращается в `local` или `unauthenticated`.

### GET /api/auth/me

Request:

- access token в `Authorization`

Response:

```json
{
  "user": {
    "id": "usr_123",
    "userId": "usr_123",
    "email": "user@example.com",
    "name": "Капитан"
  },
  "session": {
    "mode": "account",
    "status": "authenticated"
  }
}
```

Errors:

- `401 unauthorized`
- `404 user_not_found`
- `500 internal_error`

Клиент после success:

- обновляет current user в auth store;
- подтверждает account mode.

Клиент после fail:

- запускает refresh или возвращается в `local/unauthenticated`.

### POST /api/auth/migrate-local

Request:

```json
{
  "deviceId": "device_123",
  "strategy": "backup",
  "payload": {
    "data": {
      "lifequest-quests": "...",
      "lifequest-progress": "..."
    }
  }
}
```

Response:

```json
{
  "success": true,
  "userId": "usr_123",
  "importedCollections": [
    "quests",
    "todayRoute",
    "progress"
  ],
  "conflicts": [],
  "latestSyncCursor": "cursor_123"
}
```

Errors:

- `400 validation_error`
- `401 unauthorized`
- `409 conflict_detected`
- `422 migration_failed`
- `500 internal_error`

Клиент после success:

- считает account mode активным;
- делает bootstrap;
- переводит local cache в offline cache account mode.

Клиент после fail:

- остаётся в usable local/account состоянии;
- не удаляет локальные данные автоматически.

## Local → account migration

### Поток

1. пользователь работает локально;
2. создаёт аккаунт или логинится;
3. frontend собирает local backup или sync payload;
4. отправляет `POST /api/auth/migrate-local` или `POST /api/sync/import-local-backup`;
5. backend привязывает данные к `userId`;
6. frontend переключается в account mode;
7. локальный cache становится offline cache для account.

### Что мигрируется

- quests
- today route
- progress
- body logs
- money logs
- rescue logs
- companion profile
- settings profile
- prompt preferences, если они сохранены как пользовательские настройки

### Что не мигрируется

- transient UI state
- open modals
- temporary generated prompt preview
- sessionStorage
- service worker caches

### Что делать при conflict

- сначала пробовать автоматические правила из sync conflict policy;
- если конфликт не решается автоматически, backend возвращает conflict list;
- frontend позже покажет conflict handling UI;
- migration не должна молча терять данные.

### Что делать при ошибке

- не удалять local данные;
- оставить пользователя в local mode или already authenticated mode без разрушения UX;
- предложить повторить позже или пропустить migration.

### Можно ли пропустить migration

- да;
- пользователь может войти в аккаунт и не переносить локальные данные;
- тогда account mode стартует “чистым”, а local данные останутся только на устройстве до отдельного импорта.

## Ограничения текущего этапа

- не писать backend;
- не подключать реальные API;
- не вводить обязательную авторизацию;
- не ломать local-first режим ради будущего account mode.

## Текущий runtime-статус

На текущем этапе frontend уже минимально подключён к backend auth:

- `/auth` поддерживает `Войти` и `Зарегистрироваться`;
- `useAuthStore.bootstrap()` делает безопасную попытку `refresh` при старте приложения;
- access token живёт только в memory state;
- refresh token остаётся в `httpOnly` cookie;
- `Settings` показывают локальный или account mode;
- logout очищает account state frontend, но не удаляет local-first данные.

Что сознательно ещё не реализовано:

- sync runtime;
- migration local → account;
- conflict UI;
- автоматический перенос local backup в аккаунт.
