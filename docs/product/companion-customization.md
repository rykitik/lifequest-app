# Companion Customization MVP

Companion Customization делает LifeQuest личнее без превращения Companion Core в питомца, маскота или персонажа. Core остаётся системным JARVIS-like модулем: он показывает состояние, принимает сигналы и развивается вместе с пользователем.

## Зачем это нужно

Daily Game Loop уже отвечает на вопрос "что сделать сейчас". System Profile показывает рост системы. Кастомизация добавляет связь: пользователь может назвать своё ядро и выбрать визуальный режим, который ощущается как его собственная панель управления.

## Почему это не pet/mascot

Companion Core не получает лицо, тело, эмоции привязанности или needy-поведение. В MVP нет:

- персонажей;
- питомцев;
- романтического тона;
- магазина скинов;
- валюты;
- платных оболочек;
- социального сравнения.

Настройки меняют только системные visual tokens: glow, цвет, интенсивность колец, плотность сигнала и оболочку.

## Настройки MVP

### Имя Core

Default: `Companion Core`.

Правила:

- trim;
- пустое значение возвращается к default;
- максимум 24 символа;
- длинные имена переносятся в UI и не должны ломать mobile layout.

### Цвет

Preset-цвета:

- Системный / Cyan;
- Нейро / Violet;
- Баланс / Emerald;
- Импульс / Amber;
- Энергия / Rose;
- Спокойствие / Ice.

### Оболочка

Preset-оболочки:

- System Core;
- Deep Space;
- Neon Focus;
- Calm Signal.

Оболочки не являются картинками. Это параметры визуального ядра: aura, ring intensity, scan speed, pulse speed и particle density.

## Где хранится

Customization хранится local-first в `useCompanionStore`:

```ts
{
  displayName: string
  accent: 'cyan' | 'violet' | 'emerald' | 'amber' | 'rose' | 'ice'
  shell: 'system' | 'deepSpace' | 'neonFocus' | 'calmSignal'
  updatedAt?: string
}
```

Backup/export автоматически подхватывает эти данные, потому что они лежат в `lifequest-companion`.

## UX

На `/core` есть блок "Персонализация ядра":

- live preview;
- input имени;
- preset цвета;
- preset оболочки;
- кнопка "Сохранить Core".

Preview меняется сразу в draft. Persist происходит по Save.

После сохранения:

- toast: "Core обновлён.";
- Companion reaction: "Конфигурация принята.".

## Связь с progression

В MVP цвета и оболочки не блокируются уровнем, чтобы не усложнять систему и не делать магазин. Будущие формы Core смогут открывать новые оболочки как редкие meaningful milestones, а не как платные скины.

## Future stages

- unlockable shells через значимые вехи;
- rare evolution forms;
- soundless haptic-like visual pulses;
- APK home widget;
- Companion voice/tone presets;
- seasonal themes;
- deeper skill tree integration.
