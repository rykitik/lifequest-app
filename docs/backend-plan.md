# Backend Plan

## Цель

Подготовить LifeQuest к режиму аккаунтов и синхронизации, не ломая current local-first MVP.

Backend skeleton должен начинаться только после утверждения sync protocol из [sync-plan.md](/C:/Users/user/Downloads/projects/lifequest/docs/sync-plan.md).
Клиентская sync state machine должна быть зафиксирована в [client-sync-state-machine.md](/C:/Users/user/Downloads/projects/lifequest/docs/client-sync-state-machine.md), а retry policy — в [sync-retry-policy.md](/C:/Users/user/Downloads/projects/lifequest/docs/sync-retry-policy.md).
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

1. auth
2. user profile
3. sync bootstrap
4. sync state machine integration on client
5. sync push/pull
6. conflict handling UI
7. import local backup to account

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
