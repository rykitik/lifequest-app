# Backend Plan

## Цель

Подготовить LifeQuest к режиму аккаунтов и синхронизации, не ломая current local-first MVP.

## Текущий этап

Сейчас в проекте уже можно начинать backend skeleton:

- `server/` с Express + TypeScript;
- Mongo connection lifecycle;
- `/api/health` и `/api/health/ready`;
- Docker-образ для backend;
- отдельный `docker-compose.full.yml` для frontend + backend + mongo.

Сейчас текущий шаг уже расширен до минимального auth backend:

- `User model`;
- `POST /api/auth/register`;
- `POST /api/auth/login`;
- `POST /api/auth/refresh`;
- `POST /api/auth/logout`;
- `GET /api/auth/me`.

Это всё ещё не sync backend, но frontend auth integration и account-aware sync readiness уже подключены. Текущий шаг нужен как надёжная основа под account mode later.

Backend skeleton должен начинаться только после утверждения sync protocol из [sync-plan.md](/C:/Users/user/Downloads/projects/lifequest/docs/sync-plan.md).
Клиентская sync state machine должна быть зафиксирована в [client-sync-state-machine.md](/C:/Users/user/Downloads/projects/lifequest/docs/client-sync-state-machine.md), а retry policy — в [sync-retry-policy.md](/C:/Users/user/Downloads/projects/lifequest/docs/sync-retry-policy.md).
Auth strategy, state machine и token policy описаны в [auth-plan.md](/C:/Users/user/Downloads/projects/lifequest/docs/auth-plan.md).
HTTP client contract, refresh policy и error model должны быть утверждены в [http-client-plan.md](/C:/Users/user/Downloads/projects/lifequest/docs/http-client-plan.md).
Дополнительно перед backend skeleton должны быть зафиксированы `useSyncStore` contract, `syncQueue` helpers и auth plan.

## Режимы

### Local mode

- без аккаунта;
- данные живут локально;
- backup/export-import остаётся обязательной опцией сохранения.

### Account mode

- пользователь проходит `register/login`;
- получает серверный `userId`;
- backend становится главным источником синхронизации;
- локальное хранилище используется как offline cache.

### Migration

- после регистрации пользователь может загрузить local backup;
- backend привязывает импортированные сущности к новому `userId`;
- клиент получает свежий bootstrap снапшот и продолжает работу уже в account mode.

## API

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Sync

- `GET /api/sync/bootstrap`
- `POST /api/sync/push`
- `POST /api/sync/pull`
- `POST /api/sync/import-local-backup`

### Domain

- `GET /api/quests`
- `POST /api/quests`
- `PATCH /api/quests/:id`
- `DELETE /api/quests/:id`
- `GET /api/progress`
- `POST /api/progress/reward`
- `GET /api/body`
- `POST /api/body`
- `GET /api/money`
- `POST /api/money`
- `GET /api/rescue`
- `POST /api/rescue`
- `GET /api/companion`
- `PATCH /api/companion`
- `GET /api/settings`
- `PATCH /api/settings`

## Порядок реализации backend

1. Express app + healthcheck
2. Mongo connection
3. User model
4. Auth routes
5. HTTP client integration
6. Sync bootstrap/push/pull
7. Migration local → account

## Следующий backend-этап

- account-aware HTTP client слой на frontend уже подключён;
- auth session уже связана с `useSyncStore` на уровне readiness без реального sync runtime;
- `sync bootstrap` теперь реализован как первый безопасный sync endpoint;
- только после этого переходить к `sync push/pull` и conflict handling UI.

## Обновление по текущему milestone

Минимальная frontend integration для auth уже добавлена:

- frontend умеет `register/login/logout/me/refresh` через backend auth endpoints;
- access token не сохраняется в `localStorage`;
- refresh выполняется через cookie-based flow и безопасный bootstrap;
- local-first UX по-прежнему остаётся доступным без аккаунта;
- `GET /api/sync/bootstrap` уже реализован, но пока не перезаписывает клиентские данные;
- sync runtime и migration local → account всё ещё не реализованы.

Следующий рекомендуемый шаг после этого этапа:

1. Начать `sync push/pull`.
2. Затем подключить conflict handling UI.
3. И лишь потом делать migration local → account.

## Sync-модель

1. Клиент запускается в local mode.
2. Позже пользователь создаёт аккаунт.
3. Клиент отправляет local backup или локальный снапшот на `POST /api/sync/import-local-backup`.
4. Сервер создаёт сущности с `userId`.
5. Клиент делает `GET /api/sync/bootstrap` и переключается в account mode.
6. Дальше локальный persist используется как cache/offline-слой, а не как единственный storage.

## Ограничения текущего этапа

- не подключать реальный backend;
- не добавлять настоящую регистрацию;
- не менять продуктовую концепцию;
- не делать auth-gating для текущего MVP;
- не начинать backend skeleton до фиксации и принятия sync protocol.
