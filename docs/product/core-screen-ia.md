# Core Screen IA

`/core` — главный экран "моей системы" в LifeQuest.

Он не должен быть лентой виджетов. Его роль — показать текущее состояние Core, маршрут на сегодня, карту развития модулей и короткое отражение прогресса без лишней когнитивной нагрузки.

## Порядок секций

1. Core Hero / System Snapshot
2. Сегодняшний маршрут
3. Ветки развития
4. Недельное отражение
5. Вехи системы
6. Companion Core

Такой порядок сохраняет главный ответ сверху: "что происходит с моей системой прямо сейчас", а более редкие настройки и evolution details остаются ниже.

## Primary И Secondary

Primary:

- Companion Core visual;
- имя Core и состояние системы;
- уровень, XP и прогресс до следующего витка;
- главный квест дня;
- Skill Tree modules.

Secondary:

- Weekly Recap details;
- последние milestones;
- evolution progress;
- customization editor.

Customization не раскрывается по умолчанию. На `/core` сначала видна компактная summary-карточка, а editor открывается только после действия пользователя.

## Daily Quest

Today остаётся экраном действия. `/core` показывает только compact route:

- название главного квеста;
- статус;
- какой модуль усиливается;
- CTA на `/today`.

Это не дублирует Today card и не превращает Core Screen в список задач.

## Skill Tree

Skill Tree остаётся основным рабочим блоком после ежедневного маршрута:

- 6 модулей;
- 1 колонка на mobile shell;
- один следующий сигнал на модуль;
- compact Daily Quest chip, если модуль связан с главным квестом.

Не используется canvas, сложные линии, валюты, магазины или locked/paywall UI.

## Weekly Recap

Weekly Recap — короткое локальное отражение:

- headline;
- summary;
- strongest module;
- мягкий attention module;
- next week focus.

Подробные signals, milestones недели и hint к AI Weekly Review можно раскрыть отдельно. Это сохраняет экран компактным и не меняет Prompt Center contract.

## Milestones

Milestones показывают последние значимые вехи системы, а не шумные badges.

На `/core` достаточно последних 3 вех и collapse/show all, если список больше. Today не превращается в музей достижений.

## Companion Core

Companion — не питомец, не романтический персонаж и не маскот.

В нижней секции `/core` показываются:

- compact evolution state;
- progress до следующей формы;
- collapsed customization summary;
- editor настройки Core по кнопке "Настроить".

Customization editor mobile-first:

- 1 колонка;
- широкий preview сверху;
- короткий preview copy;
- заметные отличия shell presets;
- safe bottom spacing для кнопки сохранения.

## Mobile Rules

- 360/390/430px без horizontal overflow;
- Skill Tree не возвращается в 2 колонки на mobile;
- длинное имя Core переносится;
- buttons остаются внутри card;
- последний блок не перекрывается bottom nav;
- текст не ломается по буквам.

## Privacy

`/core` не выводит:

- банковские операции;
- суммы, балансы, last4;
- merchant names;
- rawDescription;
- точный вес;
- медицинские детали;
- raw focus task titles;
- raw prompt text или imported AI answer text.

Разрешены только безопасные агрегаты: "финансовое обновление", "телесный сигнал", "квест дня выполнен", "веха открыта", "backup создан".

## Anti-Toxic UX

Запрещены:

- streak pressure;
- "провал";
- "плохая неделя";
- "слабая дисциплина";
- "верни серию";
- punishment copy;
- leaderboards, social pressure, casino wording.

Тон: спокойный, системный, JARVIS-like. Core продолжает с текущей точки и предлагает один мягкий сигнал.

## Позже

- dedicated module detail screen;
- monthly recap;
- safe timeline;
- APK home summary;
- companion shell unlocks;
- module-specific weekly recap.
