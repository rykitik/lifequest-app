# Prompt for Codex: локализация уже созданного проекта

В проекте уже создан frontend skeleton LifeQuest, но часть документации и интерфейса на английском языке.

Задача: полностью локализовать пользовательскую часть на русский язык, не ломая архитектуру и не переписывая проект с нуля.

Сделай следующее:

1. Пройди по всем UI-компонентам и экранам:
   - TodayScreen
   - PlanScreen
   - BodyScreen
   - MoneyScreen
   - CoreScreen
   - RescueModal
   - PromptCenterSheet
   - CompanionCoreWidget
   - BottomNav
   - AppShell
   - mockData
   - promptBuilder

2. Замени пользовательские тексты на русский язык.

3. Навигация:
   - Today -> Сегодня
   - Plan -> План
   - Body -> Тело
   - Money -> Деньги
   - Core -> Ядро
   - Profile, если есть -> Профиль

4. Основные labels:
   - Main Quest -> Главный квест
   - Quick Win -> Быстрая победа
   - Recovery Path -> Запасной план
   - Start 2 min -> Начать 2 минуты
   - Rescue -> Спасательный режим
   - Add task -> Добавить задачу
   - Talk to Core -> Поговорить с Ядром
   - Prompt Center -> Центр промптов
   - Copy prompt -> Скопировать промпт
   - Open ChatGPT -> Открыть ChatGPT

5. Состояния:
   - Low -> Мало энергии
   - Stable -> Стабильно
   - High -> В ресурсе
   - Drifted -> Дрейф
   - Idle -> Спокоен
   - Focused -> Сфокусирован
   - Overloaded -> Перегружен
   - Recovering -> Восстанавливается
   - Evolving -> Эволюционирует

6. Prompt cards:
   - Help me plan my day -> Помоги распланировать день
   - I am stuck, return me to the system -> Я залип, верни меня в систему
   - I feel anxious, help me think clearly -> Мне тревожно, помоги мыслить ясно
   - Money / finances -> Деньги / финансы
   - Relationships / loneliness -> Отношения / одиночество
   - Help me unpack my life -> Разобрать мою жизнь

7. Prompt Builder:
   Сгенерированные промпты должны быть на русском языке.
   Стиль: спокойный, структурный, JARVIS-like, без токсичной мотивации.

8. README.md:
   Переведи пользовательскую часть на русский.
   Технические команды npm оставь как есть.

9. AGENTS.md и docs:
   Если они есть в проекте, создай или обнови русские версии.

10. После изменений запусти:
   - npm.cmd run lint
   - npm.cmd run build

11. В ответе кратко перечисли:
   - какие файлы изменены;
   - что локализовано;
   - прошли ли lint/build.
