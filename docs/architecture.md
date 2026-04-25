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

### 2. Account mode

- позже появятся `register/login/logout`;
- у каждой сущности появится `userId`;
- backend станет источником синхронизации;
- локальное хранилище останется cache/offline-слоем.

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
    useRescueStore.ts
    useCompanionStore.ts
    usePromptCenterStore.ts
    useSettingsStore.ts
  services/
    mockData.ts
    promptBuilder.ts
    lifequestReset.ts
    lifequestRuntime.ts
    lifequestBackup.ts
```

## Frontend stores

### useAuthStore

- `mode: "local" | "account"`
- `user`
- `isAuthenticated`
- `isBootstrapping`
- `bootstrap()`
- `switchToLocalMode()`
- placeholder `login/register/logout`

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

### useMoneyStore

- `snapshot`
- `dailyMoneyQuests`
- `saveSnapshot`
- `completeMoneyQuest`

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

### useSettingsStore

- `userName`
- `userRole`
- `preferredTone`
- `lastBackupExportAt`
- `resetDemoData`
- `clearAllLocalData`
- `checkPwaStatus`
- `applyPwaUpdate`

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

Подробный черновик backend-контрактов: [backend-plan.md](/C:/Users/user/Downloads/projects/lifequest/docs/backend-plan.md)
