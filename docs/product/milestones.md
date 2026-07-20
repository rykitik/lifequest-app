# LifeQuest Milestones

Milestones — это спокойная история значимых шагов в локальной системе LifeQuest.

Это не бейджи за каждый клик, не streak pressure и не социальное сравнение. Веха появляется редко, когда пользователь сделал действие, которое меняет состояние системы: завершил онбординг, зафиксировал первый сигнал тела, создал финансовую базу, выполнил первый квест дня, сохранил backup или настроил Companion Core.

## Зачем нужны milestones

LifeQuest должен показывать, что маленькие действия складываются в историю. Пользователь видит не только XP, но и следы развития системы:

- что уже активировано;
- какие контуры начали собирать сигналы;
- что Companion Core заметил рост;
- что локальная база становится устойчивее.

## Почему это не шумные achievements

Milestones не выдаются за каждую операцию, повтор воды, каждую задачу или ежедневный вход. MVP не использует:

- серии и угрозу потери серии;
- наказания за пропуски;
- лидерборды;
- случайные награды;
- платные скины или магазин;
- тревожные формулировки.

Копирайт остаётся спокойным: «Сигнал принят», «База стала точнее», «Веха зафиксирована», «Система помнит этот шаг».

## MVP milestones

System:

- «Система активирована»
- «Онбординг завершён»
- «Первая резервная копия создана»
- «Первый недельный обзор сохранён»

Body:

- «Первый сигнал тела»
- «Первый чек-ин тела принят»

Money:

- «Финансовая база создана»
- «Первый импорт операций принят»

Focus / Daily loop:

- «Первый квест дня выполнен»
- «Маршрут дня закреплён»

Companion:

- «Core персонализирован»
- «Companion Core эволюционировал»

## Как открываются

Milestones открываются рядом с существующими событиями:

- onboarding completed через reward gateway;
- body check-in через reward gateway;
- money baseline через `useMoneyStore.setupMoneyBaseline`;
- money import через reward gateway;
- daily quest completed через `completeDailyQuestReward`;
- route locked через сборку маршрута на Today;
- weekly review saved через reward gateway;
- backup exported через reward gateway;
- companion customization saved через `saveCompanionCustomization`.

Unlock idempotent: каждая веха хранится один раз по `type/id`. Повторное действие не создаёт дубликат, не повторяет milestone toast и не ломает существующий reward.

## Связь с Companion Core

При первом открытии milestone Companion получает короткую реакцию:

- «Веха зафиксирована.»
- «Сигнал сохранён в истории.»

Это подчёркивает, что Core не оценивает пользователя, а фиксирует развитие системы.

## Связь с System Profile

`/core` показывает компактный блок «Вехи системы»:

- последние безопасные milestones;
- общий счётчик;
- empty state для нового профиля.

Milestones не содержат приватных деталей: суммы, операции, медицинские подробности и raw prompt text не сохраняются.

## Local-first storage

Milestones хранятся в `lifequest-milestones`. Backup уже собирает `lifequest-*`, поэтому вехи попадают в export/import вместе с остальной локальной базой. Demo/reset path очищает этот ключ.

## Что позже

- редкие milestone chains;
- companion evolution milestones;
- skill tree;
- seasonal system logs;
- APK home summary;
- exportable life log.
