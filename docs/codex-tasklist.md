# Список задач для Codex

## Milestone 1: Frontend skeleton

1. Инициализировать React + Vite + TypeScript.
2. Подключить Tailwind CSS.
3. Подключить Zustand, React Router и Framer Motion.
4. Настроить mobile-first app shell и нижнюю навигацию.
5. Подготовить mock data.
6. Создать экран «Сегодня».
7. Создать Companion Core widget.
8. Создать Rescue modal.
9. Создать Prompt Center.
10. Сделать пользовательский UI на русском языке.

## Milestone 2: Основные продуктовые экраны

1. Собрать экраны «План», «Тело», «Деньги», «Ядро».
2. Сделать маршрут дня и интерактивные задачи.
3. Добавить XP feedback и связку с секторами.
4. Довести local-first MVP до ежедневного использования.

## Milestone 3: Local-first hygiene

1. Добавить persist для Zustand stores.
2. Добавить reset demo data и full local reset.
3. Добавить backup/export-import.
4. Добавить экран «Настройки».
5. Доработать PWA runtime и service worker update flow.

## Milestone 4: Multi-user ready preparation

1. Подготовить доменные типы к `userId`.
2. Обновить `useAuthStore` до режимов `local/account`.
3. Добавить placeholder-экран `/auth`.
4. Описать migration local data -> account.
5. Описать будущие API-контракты auth/sync/domain.
6. Не подключать backend до завершения UX-подготовки.

## Milestone 5: Backend skeleton

1. Инициализировать Express + TypeScript.
2. Подключить MongoDB + Mongoose.
3. Создать backend-модули `auth`, `sync`, `quests`, `progress`, `body`, `money`, `rescue`, `companion`, `settings`.
4. Реализовать bootstrap API для account mode.
5. Подключить frontend к backend только после готовности миграции.

## Milestone 6: Account mode and sync

1. Добавить реальные `register/login/logout`.
2. Добавить `GET /api/auth/me`.
3. Добавить `GET /api/sync/bootstrap`.
4. Добавить `POST /api/sync/import-local-backup`.
5. Перевести localStorage в роль cache/offline-слоя.
6. Сохранить local-first fallback даже после появления аккаунтов.
