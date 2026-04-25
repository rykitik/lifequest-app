# Список задач для Codex

## Milestone 1: Frontend skeleton

1. Инициализировать React + Vite + TypeScript.
2. Подключить Tailwind CSS.
3. Подключить Zustand, React Router, Framer Motion и Axios.
4. Создать структуру папок из `docs/architecture.md`.
5. Настроить глобальные стили и theme tokens.
6. Создать мобильную оболочку приложения.
7. Создать нижнюю навигацию.
8. Подготовить mock data.
9. Создать Zustand stores.
10. Собрать экран «Сегодня».
11. Собрать Companion Core widget.
12. Собрать Rescue modal.
13. Собрать Prompt Center.
14. Проверить mobile-first layout.
15. Сделать весь пользовательский UI на русском языке.

## Milestone 2: Основные продуктовые экраны

1. Собрать экран «План».
2. Собрать экран «Тело».
3. Собрать экран «Деньги».
4. Собрать экран «Ядро».
5. Добавить переходы между маршрутами.
6. Добавить XP-toast.
7. Добавить захват и классификацию задач.
8. Добавить mock-разворачивание задачи на 3 шага.
9. Проверить все тексты интерфейса на русском языке.

## Milestone 3: Backend skeleton

1. Инициализировать Express + TypeScript.
2. Подключить MongoDB + Mongoose.
3. Создать структуру backend-модулей.
4. Добавить модель Quest.
5. Добавить модель Progress.
6. Добавить модель BodyLog.
7. Добавить модель MoneyLog.
8. Добавить модель RescueLog.
9. Добавить базовые API-роуты.
10. Подключить frontend к backend.

## Milestone 4: Auth and persistence

1. Добавить JWT auth.
2. Добавить refresh token в httpOnly cookie.
3. Добавить axios interceptor.
4. Сохранять пользовательские данные.
5. Постепенно заменить mock data на реальные данные.

## Milestone 5: PWA

1. Добавить PWA manifest.
2. Добавить иконки приложения.
3. Сделать приложение устанавливаемым.
4. Позже добавить offline fallback.

## Milestone 6: Telegram позже

1. Создать Telegram bot через BotFather.
2. Добавить webhook endpoint.
3. Добавить команды:
   - `/today`
   - `/rescue`
   - `/plan`
   - `/log`
   - `/talk`
4. Оставить Telegram быстрым интерфейсом, а не главным приложением.
