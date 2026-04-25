# Sync Retry Policy

## Цель

Описать правила повторных попыток синхронизации до runtime-реализации и backend skeleton.

## Основной подход

- использовать exponential backoff
- различать retryable и non-retryable ошибки
- не пытаться синхронизироваться в offline mode
- позволять manual retry
- после старта приложения проверять pending queue и при необходимости возобновлять sync

## Exponential backoff

Рекомендуемый базовый профиль:

- `initialDelayMs = 2000`
- `multiplier = 2`
- `maxDelayMs = 60000`
- `maxAttempts = 5`

Пример:

1. 2 секунды
2. 4 секунды
3. 8 секунд
4. 16 секунд
5. 32 секунды

После достижения `maxDelayMs` задержка дальше не растёт.

## Retryable errors

- network error
- timeout
- `5xx`
- временная потеря соединения во время sync cycle

## Non-retryable errors

- `401`
- `403`
- validation `400`
- schema mismatch

Такие ошибки должны переводить sync в `error` или требовать ручного действия, а не бесконечных повторов.

## Manual retry

- пользователь позже должен иметь кнопку ручного повтора
- manual retry может повторно перевести `error` или `conflict` в `syncing`
- manual retry не должен дублировать уже применённые reward/complete операции

## Offline mode

- в `offline` статусе автоматический retry ставится на паузу
- queue продолжает накапливать локальные изменения
- возврат сети переводит клиента к новой попытке sync

## Retry after app start

- если приложение стартует и есть pending queue, клиент должен проверить сеть
- при наличии сети нужно попытаться продолжить sync
- при отсутствии сети нужно остаться в `offline`, не теряя queue

## Особые замечания

### Reward operations

- должны иметь `sourceId`
- retry обязан оставаться идемпотентным
- сервер later не должен начислять один и тот же reward дважды

### Conflict case

- conflict не должен бесконечно retry’иться как обычная network error
- после получения конфликта статус клиента должен стать `conflict`
- дальнейшая попытка — только после automatic merge или manual resolution

### Logout

- logout прекращает account sync cycle
- retry-таймеры должны очищаться
- клиент возвращается в `local_only`
