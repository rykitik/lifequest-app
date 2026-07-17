# Архитектура LifeQuest

## Главная стратегия

LifeQuest строится как `local-first now, multi-user ready later`.

Сейчас продукт остаётся solo-first и работает без аккаунта. Следующий архитектурный слой должен не ломать текущий local-first MVP, а готовить его к будущему account mode и синхронизации.

## Режимы работы

### 1. Local mode

- данные живут в `localStorage` через Zustand persist;
- backup/export-import заменяет облачное сохранение;
- UI доступен без входа;
- устройство считается главным местом хранения.
- это режим по умолчанию для static production deploy на `ry-kit.ru`.

### 2. Account mode

- минимальные `register/login/logout/refresh/me` уже есть в backend-коде;
- frontend включает account/auth runtime только при `VITE_AUTH_ENABLED=true`;
- static production deploy собирается с `VITE_AUTH_ENABLED=false` и не делает auth refresh на старте;
- первый sync-домен `settingsProfile` работает только вручную и только в account-enabled сборке;
- для остальных сущностей позже появится `userId`;
- backend позже станет источником общей синхронизации;
- локальное хранилище останется cache/offline-слоем.

### 2.1 Runtime deploy modes

Current static PWA mode:

- GitHub Actions собирает frontend `dist`;
- VPS системный `nginx` отдаёт `/var/www/lifequest/current`;
- Docker не используется;
- backend/API не запущен;
- `VITE_AUTH_ENABLED=false`;
- `VITE_API_URL=` пустой;
- Today, Body, Money, Prompt Center, Weekly Review и Onboarding работают без backend.

Future full Docker mode:

- `docker-compose.full.yml`;
- frontend nginx container проксирует `/api/` в backend container;
- backend + MongoDB запущены;
- `VITE_AUTH_ENABLED=true`;
- `VITE_API_URL=/api`;
- auth/sync можно включать без удаления local-first режима.

### 3. Migration

- пользователь сможет создать аккаунт после периода local-only использования;
- local data можно будет перенести в аккаунт после регистрации;
- backup и sync bootstrap помогут не потерять прогресс при миграции.

## Frontend-структура

```text
src/
  app/
    App.tsx
    router.tsx
    providers.tsx
  shared/
    components/
    lib/
    types/
  features/
    auth/
    today/
    plan/
    quests/
    progress/
    body/
    money/
    rescue/
    companion/
    prompt-center/
    settings/
  stores/
    useAuthStore.ts
    useTodayStore.ts
    useQuestStore.ts
    useProgressStore.ts
    useBodyStore.ts
    useMoneyStore.ts
    useWeeklyReviewStore.ts
    useRescueStore.ts
    useCompanionStore.ts
    usePromptCenterStore.ts
    useSettingsStore.ts
  services/
    mockData.ts
    contextBuilder.ts
    promptBuilder.ts
    promptResponseParser.ts
    moneyImport/
    lifequestReset.ts
    lifequestRuntime.ts
    lifequestBackup.ts
    deviceIdentity.ts
```

## Frontend stores

### useAuthStore

- `mode: "local" | "account"`
- `user`
- `isAuthenticated`
- `isBootstrapping`
- `bootstrap()`
- `switchToLocalMode()`
- `login()`
- `register()`
- `logout()`
- access token живёт только в memory state, refresh token остаётся в `httpOnly` cookie backend

### useTodayStore

- `currentMode`
- `route`
- `setMode`
- `generateRoute`
- `completeRouteItem`

### useQuestStore

- `inbox`
- `active`
- `parked`
- `addQuest`
- `classifyQuest`
- `unpackQuest`
- `completeQuest`

### useProgressStore

- `level`
- `totalXp`
- `actionXp`
- `consistencyXp`
- `recoveryXp`
- `sectors`
- `applyReward`

### useBodyStore

- `today`
- `history`
- `saveCheckin`
- daily logs для недельного контекста тела

### useMoneyStore

- `trackingStartDate`
- `accounts`
- `transactions`
- `plannedPayments`
- `debts`
- `monthlyPlans`
- `importPreview`
- `lastImportAt`
- `addAccount`, `updateAccount`, `archiveAccount`
- `addTransaction`, `updateTransaction`, `deleteTransaction`
- `completePlannedPayment`, `recordDebtPayment`
- `setTrackingStartDate`, `setupMoneyBaseline`
- `setImportPreview`, `importPreviewTransactions`
- баланс считается из `openingBalance + income - expense +/- adjustment`
- `credit_card` не увеличивает общий баланс, `creditDebt` считается отдельно

### useRescueStore

- `currentProblem`
- `suggestion`
- `setProblem`
- `generateSuggestion`
- `acceptSuggestion`
- `completeSuggestion`

### useCompanionStore

- `mood`
- `evolutionLevel`
- `activeMessage`
- `updateMoodFromContext`

### usePromptCenterStore

- `selectedCardId`
- `generatedPrompt`
- `generatePrompt`
- `copyPrompt`
- `openChatGPT`
- `parseImportedResponse`
- `applyImportedResponse`
- weekly review flow через внешний ChatGPT без OpenAI API

### useWeeklyReviewStore

- `summaries`
- persist key `lifequest-weekly-reviews`
- хранит до 12 подтверждённых недельных итогов
- дедупликация по периоду недели
- не сохраняет полный prompt, PDF/text выписки и полный список операций

### useSettingsStore

- `userName`
- `userRole`
- `preferredTone`
- профиль тела: рост, цель, темп, активность, ограничения
- `lastBackupExportAt`
- `resetDemoData`
- `clearAllLocalData`
- `checkPwaStatus`
- `applyPwaUpdate`
- ручная синхронизация `settingsProfile` в account mode

## Готовность доменных типов к multi-user

Следующие сущности уже должны быть готовы к будущему `userId`, даже если local mode продолжает работать без него:

- `Quest`
- `DailyRoute`
- `ProgressProfile`
- `BodyLog`
- `MoneyLog`
- `RescueLog`
- `CompanionProfile`
- `SettingsProfile`
- `UserProfile`

Правило: local mode может не иметь `userId`, account mode позже будет требовать его на серверной стороне.

## Sync protocol

- sync payload-форматы и conflict policy зафиксированы в [sync-plan.md](./sync-plan.md)
- до начала backend skeleton protocol должен считаться утверждённым
- `src/shared/types/sync.ts` содержит sync-ready frontend типы, но пока не подключён к runtime
- `src/services/deviceIdentity.ts` готовит `deviceId` для будущих push/pull/import flow

## Будущий backend

```text
server/
  src/
    app.ts
    server.ts
    config/
    middleware/
    modules/
      auth/
      users/
      sync/
      quests/
      progress/
      body/
      money/
      rescue/
      companion/
      settings/
      prompt-presets/
```

## Будущие API-контракты

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

- `/api/quests`
- `/api/progress`
- `/api/body`
- `/api/money`
- `/api/rescue`
- `/api/companion`
- `/api/settings`

Подробный черновик backend-контрактов: [backend-plan.md](./backend-plan.md)

Подробный sync protocol, payloads и conflict rules: [sync-plan.md](./sync-plan.md)
