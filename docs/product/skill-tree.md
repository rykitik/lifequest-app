# LifeQuest Skill Tree

Skill Tree в LifeQuest — это карта развития жизненных модулей, а не шумная RPG-система.

Задача блока на `/core`: показать, какие контуры уже получают сигналы, где база только собирается и какой следующий спокойный шаг усилит систему. Это продолжение daily loop: квест дня даёт сигнал, Companion реагирует, профиль растёт, milestones сохраняют историю, а Skill Tree показывает, какой модуль стал сильнее.

## Почему это не RPG-шум

Skill Tree не использует:

- canvas-карту с линиями;
- десятки мелких бейджей;
- streak pressure;
- наказания за пропуски;
- случайные награды;
- валюту, магазин или paywall;
- сравнение с другими.

Состояния звучат спокойно: «Нужны первые сигналы», «База собирается», «Модуль активен», «База стабильна», «Готовится виток».

## Модули MVP

Тело:

- телесная база;
- вода, шаги, тренировка, питание, daily logs;
- следующий сигнал обычно связан с чек-ином тела.

Деньги:

- финансовая база;
- старт учёта, импорт, сверка, planned payments, debts, warnings;
- суммы, операции и raw bank text не попадают в module output.

Фокус:

- маршрут дня;
- daily quest, quick win, today route, completed tasks;
- приватные focus-задачи на `/core` показываются безопасным fallback: «Закрыть один быстрый шаг».

Восстановление:

- контур устойчивости;
- low energy, drifted mode, recovery route, recovery XP, weekly review;
- low energy не считается провалом.

Система:

- профиль и защита локальной базы;
- onboarding, backup, профильные настройки, system milestones.

Companion:

- Companion Core;
- имя/оболочка, evolution level, active message, companion milestones;
- это системное ядро, не pet/mascot и не персонаж.

## Как считаются состояния

View model строится в `src/features/profile/lib/skillTree.ts`.

Каждый модуль получает:

- `progressPercent` от 0 до 100;
- `state`;
- `levelLabel`;
- `summary`;
- `nextSignal`;
- milestone count;
- последние 1–2 безопасные milestones;
- linked daily quest, если квест усиливает этот модуль.

Если данных мало, модуль не выглядит как провал. Он показывает «Нужны первые сигналы» и предлагает первый безопасный шаг.

## Daily Quest

Daily Quest связывается с модулем по domain:

- body → Тело;
- money → Деньги;
- focus → Фокус;
- recovery → Восстановление;
- system → Система.

Для focus-квестов используется безопасный title, чтобы не выводить приватный текст пользовательской задачи на `/core`.

## Module Quest Suggestions

Module Quest Suggestion — это один мягкий следующий сигнал для конкретного модуля. Это не todo list и не отдельная очередь задач: карточка модуля отвечает на вопрос «что сделать, чтобы усилить именно этот контур?».

Каждый модуль получает максимум одно предложение:

- Тело: чек-ин тела, вода, короткая прогулка или поддержка телесной базы;
- Деньги: финансовая база, импорт, проверка предупреждений или спокойная сверка;
- Фокус: главный квест дня, quick win или выбор одного фокуса;
- Восстановление: снижение перегруза, мягкий recovery route или устойчивый темп;
- Система: backup, профиль, первичная настройка или проверка настроек;
- Companion: настройка Core, сигналы для следующей формы или проверка состояния ядра.

Suggestion состоит из безопасного title, короткого caption, action label, action type, priority и safe domain. Он детерминированно строится из local-first данных и не делает API calls.

Если suggestion совпадает с Daily Quest, `/core` показывает chip «Квест дня» или «Квест дня выполнен». Завершение квеста и XP остаются в existing daily quest reward gateway, поэтому suggestions не создают бесконечный фарм.

Действия в MVP в основном навигационные:

- `open_body` и `add_water` ведут на `/body`;
- `open_money` ведёт на `/money`;
- `open_today` и `open_recovery` ведут на `/today`;
- `open_backup` ведёт на `/settings`;
- `open_companion_customization` скроллит к настройке Core на `/core`.

Такой подход оставляет полезное действие явным для пользователя и не добавляет скрытых мутаций из карты модулей.

## Milestones

Milestones группируются по domain:

- body;
- money;
- focus;
- recovery/system;
- companion.

В модуле показывается только счётчик и последние безопасные названия вех. Приватные детали не используются: суммы, операции, медицинские подробности, notes и raw prompt text не сохраняются в output.

Module suggestions используют те же privacy rules: не выводят raw focus task text, банковские операции, суммы, последние 4 цифры счёта, медицинские детали, notes или prompt content.

## Companion

Companion module отражает:

- настроено ли ядро;
- текущий evolution level;
- есть ли companion milestone;
- какой следующий сигнал поможет новому витку.

Copy остаётся в JARVIS/System Core стиле: ядро принимает сигналы системы и развивается вместе с устойчивыми действиями.

## Anti-Toxicity

Suggestions не используют:

- «серия потеряна»;
- «провал»;
- штрафы и наказания;
- fear-of-missing-out;
- сравнение с другими;
- casino reward wording.

Если данных мало, текст остаётся спокойным: «Нужен первый сигнал», «База собирается», «Начни с малого».

## Что позже

- раскрываемые ветки;
- module-specific quests;
- module-specific quest chains;
- evolution gates;
- cosmetic unlocks;
- unlockable companion shells;
- APK home widget;
- weekly module recap.
