# LifeQuest

LifeQuest — mobile-first персональная операционная система жизни.

Это не обычный todo app. Приложение помогает держать спокойный маршрут дня, возвращаться в систему после тяжёлых дней, видеть прогресс по базовым жизненным секторам и использовать внешний ChatGPT через Центр промптов без встроенного платного API.

## Текущий статус

- local-first MVP;
- русский mobile-first интерфейс;
- Zustand persist и backup/export-import;
- PWA с service worker и Docker-обвязкой;
- backend skeleton с Express + Mongo healthcheck;
- без auth/sync backend-логики и без реального аккаунта на текущем этапе.

## Стратегия развития данных

LifeQuest = local-first now, multi-user ready later.

### 1. Local mode

- данные хранятся локально на устройстве;
- вход в аккаунт не нужен;
- backup/export-import используется как способ сохранения;
- localStorage остаётся основным persist-слоем.

### 2. Account mode

- позже появятся login/register;
- у пользователя будет `userId`;
- данные будут синхронизироваться с backend;
- localStorage останется cache/offline-слоем, а не единственным источником данных.

### 3. Migration

- пользователь сможет зарегистрироваться позже;
- после регистрации local data можно будет перенести в аккаунт;
- backup/import и локальный cache помогут пройти миграцию без потери данных.

## Что уже есть

- экран `Сегодня` с маршрутом дня;
- экран `План` с задачами и автосбором маршрута;
- экраны `Тело`, `Деньги`, `Ядро`, `Настройки`;
- `Спасательный режим`;
- `Центр промптов` с генерацией контекста для внешнего ChatGPT;
- local-first reset, backup/export-import и PWA runtime;
- placeholder-экран `/auth` для будущих аккаунтов.
- backend skeleton в `server/` с health endpoints и Mongo lifecycle.

## Prompt Center

В MVP приложение не вызывает OpenAI API.

Вместо этого LifeQuest:

- собирает текущий контекст пользователя;
- формирует структурированный промпт на русском языке;
- копирует его в буфер или показывает fallback для ручного копирования;
- открывает внешний ChatGPT.

## Запуск через Docker

Production:

```bash
docker compose up --build
```

Открыть:

```text
http://localhost:3000
```

Dev через Docker:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Открыть:

```text
http://localhost:5173
```

Full stack через Docker:

```bash
docker compose -f docker-compose.full.yml up --build
```

Открыть:

```text
Frontend: http://localhost:3000
Backend: http://localhost:4000/api/health
Ready probe: http://localhost:4000/api/health/ready
```

## Обычный запуск через npm

Установить зависимости:

```bash
npm.cmd install
```

Запустить dev-сервер:

```bash
npm.cmd run dev
```

Собрать production-бандл:

```bash
npm.cmd run build
```

Проверить линтер:

```bash
npm.cmd run lint
```

## Backend: запуск отдельно

Перейти в backend-папку:

```bash
cd server
```

Установить зависимости:

```bash
npm.cmd install
```

Запустить dev-сервер:

```bash
npm.cmd run dev
```

Собрать backend:

```bash
npm.cmd run build
```

Проверить типы:

```bash
npm.cmd run typecheck
```

Проверить health endpoints:

```text
http://localhost:4000/api/health
http://localhost:4000/api/health/ready
```

## Frontend: запуск отдельно

В корне проекта:

```bash
npm.cmd install
npm.cmd run dev
```

Открыть:

```text
http://localhost:5173
```

## Ближайший следующий слой

- добавить `User model` и начать `auth routes` поверх текущего backend skeleton;
- после этого подключать только минимальный account-layer без поломки local-first UX;
- sync bootstrap/push/pull начинать только после auth skeleton.
