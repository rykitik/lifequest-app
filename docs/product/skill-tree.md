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

## Milestones

Milestones группируются по domain:

- body;
- money;
- focus;
- recovery/system;
- companion.

В модуле показывается только счётчик и последние безопасные названия вех. Приватные детали не используются: суммы, операции, медицинские подробности, notes и raw prompt text не сохраняются в output.

## Companion

Companion module отражает:

- настроено ли ядро;
- текущий evolution level;
- есть ли companion milestone;
- какой следующий сигнал поможет новому витку.

Copy остаётся в JARVIS/System Core стиле: ядро принимает сигналы системы и развивается вместе с устойчивыми действиями.

## Что позже

- раскрываемые ветки;
- module-specific quests;
- evolution gates;
- cosmetic unlocks;
- APK home widget;
- weekly module recap.
