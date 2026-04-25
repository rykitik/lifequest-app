# Архитектура LifeQuest

## Общая схема

```text
Mobile-first PWA
  |
  |-- React UI
  |-- Zustand stores
  |-- Центр промптов
  |-- Сначала mock data
  |
Backend позже
  |
  |-- Express API
  |-- MongoDB
  |-- Auth
  |-- Domain services
```

## Структура frontend

```text
src/
  app/
    App.tsx
    router.tsx
    providers.tsx
  shared/
    components/
    hooks/
    lib/
    types/
    utils/
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
  services/
    apiClient.ts
    promptBuilder.ts
    mockData.ts
  styles/
    globals.css
```

## Состояние frontend

### useAuthStore
- user
- isAuthenticated
- bootstrap
- login
- logout

### useTodayStore
- currentMode
- route
- setMode
- generateRoute
- completeRouteItem

### useQuestStore
- inbox
- active
- parked
- addQuest
- classifyQuest
- unpackQuest
- completeQuest

### useProgressStore
- level
- totalXp
- actionXp
- consistencyXp
- recoveryXp
- sectors
- applyReward

### useBodyStore
- today
- history
- saveCheckin

### useMoneyStore
- snapshot
- dailyMoneyQuests
- saveSnapshot
- completeMoneyQuest

### useRescueStore
- currentProblem
- suggestion
- setProblem
- generateSuggestion
- acceptSuggestion
- completeSuggestion

### useCompanionStore
- mood
- evolutionLevel
- activeMessage
- updateMoodFromContext

### usePromptCenterStore
- selectedCard
- generatedPrompt
- generatePrompt
- copyPrompt
- openChatGPT

## Структура backend

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
      quests/
      progress/
      body/
      money/
      rescue/
      companion/
      prompt-presets/
      telegram/
    shared/
      db/
      errors/
      utils/
```

## Mongo-сущности

### User
- email
- name
- profile
- preferences

### Quest
- userId
- title
- description
- domain
- type
- effort
- impact
- status
- estimatedMinutes
- parentQuestId
- createdAt
- updatedAt

### DailyRoute
- userId
- date
- mode
- mainQuestId
- quickWinId
- recoveryQuestId

### ProgressProfile
- userId
- level
- totalXp
- actionXp
- consistencyXp
- recoveryXp
- sectors

### BodyLog
- userId
- date
- weight
- waterMl
- steps
- workoutDone
- foodOnTrack

### MoneyLog
- userId
- date
- balance
- debt
- notes

### RescueLog
- userId
- date
- problem
- suggestionId
- accepted
- completed

### CompanionProfile
- userId
- evolutionLevel
- mood
- unlockedStates

### PromptPreset
- key
- title
- description
- template
- category

## API-контракты

Auth:
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout
- GET /api/auth/me

Quests:
- GET /api/quests
- POST /api/quests
- PATCH /api/quests/:id
- PATCH /api/quests/:id/complete
- POST /api/quests/:id/unpack

Today:
- GET /api/today/route
- POST /api/today/route/generate
- PATCH /api/today/mode

Progress:
- GET /api/progress
- POST /api/progress/reward

Body:
- GET /api/body
- POST /api/body/checkin

Money:
- GET /api/money
- POST /api/money/checkin

Rescue:
- POST /api/rescue/generate
- POST /api/rescue/accept
- POST /api/rescue/complete

Companion:
- GET /api/companion
- PATCH /api/companion

Prompt Center:
- GET /api/prompt-presets
- POST /api/prompt-presets/generate
