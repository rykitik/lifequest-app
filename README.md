# LifeQuest

LifeQuest — mobile-first персональная операционная система жизни.

Это не обычный todo app. Приложение помогает держать спокойный маршрут дня, возвращаться в систему после тяжёлых дней, видеть прогресс по базовым жизненным секторам и использовать внешний ChatGPT через Центр промптов без встроенного платного API.

## Текущий статус

- local-first MVP;
- русский mobile-first интерфейс;
- Zustand persist и backup/export-import;
- static PWA deploy на `ry-kit.ru` без обязательного backend;
- PWA с service worker, manifest и Docker-обвязкой для будущего full-stack режима;
- backend skeleton с Express + Mongo healthcheck;
- минимальные auth endpoints на backend: `register`, `login`, `refresh`, `logout`, `me`;
- frontend auth/sync runtime выключен по умолчанию в static production через `VITE_AUTH_ENABLED=false`;
- первый безопасный sync-домен `settingsProfile` оставлен как manual/future account-ready слой;
- без общего sync runtime, без migration local → account и без синхронизации квестов/прогресса на текущем этапе.

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
- профиль LifeQuest в `Настройках`: рост, цель тела, темп, активность, сон и ограничения;
- body daily logs и краткий профиль тела на экране `Тело`;
- local-first money module: счета, операции, плановые платежи, долги, план месяца и старт учёта денег;
- импорт Сбер-выписок из PDF/text локально в браузере, preview, дедупликация и пропуск операций до даты старта учёта;
- Weekly Review через внешний ChatGPT: контекст по телу + деньгам, импорт JSON-ответа, применение выбранных действий;
- история недельных итогов с локальным хранением и приватной фильтрацией данных;
- `Спасательный режим`;
- `Центр промптов` с генерацией контекста для внешнего ChatGPT;
- local-first reset, backup/export-import и PWA runtime;
- экран `/auth` с login/register для account-enabled сборок и безопасным возвратом в local mode;
- backend skeleton в `server/` с health endpoints и Mongo lifecycle.
- backend auth-слой с `User model` и минимальными auth routes, готовыми для будущего включения без поломки local-first UX.

## Production deploy modes

### Current: Static PWA deploy

Сейчас `ry-kit.ru` работает без backend:

```text
ry-kit.ru
↓
системный nginx
↓
/var/www/lifequest/current
↓
готовый frontend dist
↓
local-first LifeQuest
```

GitHub Actions собирает frontend с:

```env
VITE_AUTH_ENABLED=false
VITE_API_URL=
```

Это означает: приложение не делает обязательный `/api/auth/refresh` на старте, не требует вход и сохраняет Today, Body, Money, Prompt Center, Weekly Review и Onboarding локально.

### Future: Full Docker deploy

Позже можно включить full-stack режим:

```bash
docker compose -f docker-compose.full.yml up --build
```

В этом режиме frontend container проксирует `/api/` в backend container, а сборка использует:

```env
VITE_AUTH_ENABLED=true
VITE_API_URL=/api
```

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

## Backend auth endpoints

Сейчас backend уже поднимает:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Важно:

- access token возвращается только в JSON-ответе;
- refresh token хранится только в `httpOnly` cookie;
- frontend использует эти endpoints только в сборках с `VITE_AUTH_ENABLED=true`;
- local-first UX по-прежнему не ломается и остаётся доступным без аккаунта.

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

Проверить auth flow через PowerShell:

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

$registerBody = @{
  email = "user@example.com"
  password = "password123"
  name = "Ivan"
} | ConvertTo-Json

(Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/auth/register" -WebSession $session -ContentType "application/json" -Body $registerBody)
```

```powershell
$loginBody = @{
  email = "user@example.com"
  password = "password123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/auth/login" -WebSession $session -ContentType "application/json" -Body $loginBody
$accessToken = $loginResponse.tokens.accessToken
```

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:4000/api/auth/me" -Headers @{ Authorization = "Bearer $accessToken" }
Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/auth/refresh" -WebSession $session
Invoke-RestMethod -Method Post -Uri "http://localhost:4000/api/auth/logout" -WebSession $session
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

- сделать полный просмотр сохранённого недельного итога;
- усилить ежедневный вход в систему через один актуальный следующий шаг;
- улучшить доверие к деньгам: история корректировок, объяснение расхождений, фильтры imported/manual/adjustment;
- держать backup заметным safety net до общего sync runtime.

Актуальный план развития: [docs/roadmap.md](./docs/roadmap.md).

## Frontend auth: текущий этап

Сейчас frontend уже минимально подключён к backend auth endpoints:

- экран `/auth` умеет `Войти` и `Зарегистрироваться`;
- `useAuthStore.bootstrap()` при старте приложения пробует `POST /api/auth/refresh`;
- access token хранится только в memory state frontend и не попадает в `localStorage`;
- refresh token остаётся только в `httpOnly` cookie backend;
- `Настройки` показывают `Локальный режим` или `Аккаунт подключён`;
- logout возвращает приложение в local mode и не удаляет local-first данные;
- sync и migration local → account пока не реализованы.

## Sync readiness: текущий этап

Сейчас frontend уже связан с `useSyncStore`, но без реального sync runtime:

- после auth bootstrap приложение инициализирует `deviceId`;
- в local mode sync status остаётся `local_only`;
- в account mode sync status переходит в `idle` или `offline` в зависимости от сети;
- `Настройки` показывают sync readiness, очередь изменений, last sync и короткий `deviceId`;
- offline/online события обновляют только readiness-состояние и не запускают `push/pull`.

## Sync bootstrap: текущий этап

Сейчас уже реализован первый safe sync endpoint:

- `GET /api/sync/bootstrap`
- endpoint защищён access token
- frontend вызывает его только вручную из `Настроек`
- bootstrap пока не синхронизирует данные и не перезаписывает local-first stores
- на этом этапе проверяется только связь account mode с сервером
- bootstrap может вернуть серверный `settingsProfile`, но frontend пока не применяет его автоматически

### Как проверить sync bootstrap

1. Подними full stack:

```bash
docker compose -f docker-compose.full.yml up --build
```

2. Зарегистрируйся или войди через `/auth`
3. Открой `/settings`
4. Нажми `Проверить синхронизацию`
5. Убедись, что:
   - появляется сообщение `Сервер доступен`
   - обновляется `Последняя синхронизация`
   - локальные данные на экране `Сегодня` не перезаписываются

Важно:

- `push/pull` ещё не реализованы;
- migration `local → account` ещё не реализована;
- пока проверяется только account sync readiness, а не реальный обмен данными.

## Settings profile sync: текущий этап

Первый реальный sync-домен сейчас ограничен только `settingsProfile`:

- синхронизируются только `userName`, `userRole`, `preferredTone`;
- sync запускается вручную из экрана `Настройки`;
- `quests`, `today route`, `progress`, `body`, `money`, `rescue` и другие домены пока не синхронизируются;
- background sync runner по-прежнему не включён.

### Backend endpoints

- `GET /api/settings/profile`
- `PUT /api/settings/profile`

### Как проверить settings sync

1. Подними full stack:

```bash
docker compose -f docker-compose.full.yml up --build
```

2. Войди или зарегистрируйся через `/auth`
3. Открой `/settings`
4. Измени имя, роль или тон и нажми `Сохранить профиль`
5. Нажми `Сохранить настройки в аккаунт`
6. Измени локальные поля ещё раз и снова нажми `Сохранить профиль`
7. Нажми `Загрузить настройки с сервера`
8. Убедись, что:
   - поля возвращаются к сохранённому серверному значению
   - появляются `syncVersion` и дата синхронизации настроек
   - локальные данные других доменов не меняются

### Frontend + backend локально

1. Подними backend и Mongo:

```bash
docker compose -f docker-compose.full.yml up --build
```

2. Для frontend dev создай `.env` по примеру `.env.example` или оставь дефолтный локальный backend:

```bash
VITE_API_URL=http://localhost:4000/api
```

3. Запусти frontend:

```bash
npm.cmd install
npm.cmd run dev
```

Открыть:

```text
Frontend dev: http://localhost:5173
Frontend Docker: http://localhost:3000
Backend health: http://localhost:4000/api/health
```

### Как проверить auth из UI

1. Открой `/auth`
2. Создай аккаунт через вкладку `Зарегистрироваться`
3. После успеха приложение переведёт на `/today`
4. Открой `/settings` и проверь блок `Аккаунт и синхронизация`
5. Нажми `Выйти` и убедись, что приложение вернулось в local mode
6. Повтори вход через вкладку `Войти`

Важно:

- local-first данные не должны удаляться при login/logout;
- backup/export-import остаются рекомендуемым способом сохранения прогресса;
- для VPS позже нужно будет задать `VITE_API_URL=https://ry-kit.ru/api` или поднять reverse proxy, но этот этап ещё не включён в runtime sync.
