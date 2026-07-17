# APK roadmap

## Текущий лучший путь

LifeQuest сначала должен стать устойчивой PWA. Это подходит текущей local-first архитектуре: данные остаются на устройстве, приложение устанавливается из браузера, а backend/auth не являются обязательными для запуска.

## APK path через Capacitor

Когда PWA-основа будет стабильной, можно обернуть тот же React/Vite build через Capacitor и собрать Android APK. Это дешевле и безопаснее, чем переписывать продукт на другой стек.

## Что нужно перед APK

- стабильный backup/export-import и заметное напоминание о backup;
- устойчивый offline runtime: shell, основные маршруты и localStorage stores работают без сети;
- PNG-иконки 192/512, maskable icon и splash assets;
- отсутствие обязательного backend/auth на старте;
- mobile smoke tests для ширин 360, 390 и 430 px;
- проверка Today, Body, Money, Prompt Center, Weekly Review и Onboarding без сети;
- Android build setup: Java, Android Studio SDK, Gradle, Capacitor config.

## Что не делать сейчас

- не переписывать на Flutter или React Native;
- не делать backend обязательным;
- не ломать local-first режим ради аккаунтов;
- не внедрять OpenAI API в MVP;
- не начинать Play Market/TWA решение до проверки PWA-install поведения.

## Будущие этапы

### Stage 1: PWA install polish

- проверить install prompt на Android Chrome;
- пройти Lighthouse PWA checks;
- добавить финальные splash/icon assets;
- проверить safe-area и мобильные ширины 360/390/430 px;
- сделать backup reminder.

### Stage 2: Capacitor wrapper

- добавить Capacitor без изменения доменной логики;
- подключить web build из `dist`;
- проверить storage и offline runtime внутри WebView.

### Stage 3: Android APK debug build

- собрать debug APK;
- установить на телефон;
- проверить onboarding, Today, Body, Money, Prompt Center и backup/import.

### Stage 4: Signed release APK

- настроить keystore;
- собрать release APK;
- описать ручной update/backup flow до появления cloud sync.

### Stage 5: optional Play Market/TWA decision

- решить, нужен ли Play Market;
- сравнить Capacitor APK и Trusted Web Activity;
- не включать обязательный backend только ради публикации.
