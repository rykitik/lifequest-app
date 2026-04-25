# Деплой LifeQuest на VPS

Текущий production-деплой рассчитан на frontend-only сборку и обычный `nginx` на сервере.

## Что уже ожидается на сервере

- домен и SSL уже настроены через `nginx`;
- релизы выкладываются в `/var/www/lifequest/releases`;
- активная версия приложения должна быть доступна через симлинк `/var/www/lifequest/current`.

## GitHub Actions secrets

Для workflow `.github/workflows/deploy.yml` нужны три секрета:

- `VPS_HOST` — IP или домен VPS;
- `VPS_USER` — SSH-пользователь для деплоя, например `lifequest-deploy`;
- `VPS_SSH_KEY` — приватный SSH-ключ в формате base64, которым GitHub Actions входит на сервер.

## Как работает выкладка

1. GitHub Actions делает `npm ci`.
2. Собирает production-версию через `npm run build`.
3. Упаковывает `dist/` в архив.
4. Загружает архив на VPS по SSH.
5. Запускает `scripts/deploy-frontend.sh` на сервере.
6. Скрипт распаковывает релиз в новую папку, обновляет симлинк `current` и делает `nginx reload`.

## Что важно помнить

- На сервере больше не требуется Docker для production-выкладки frontend.
- Скрипт хранит несколько последних релизов и удаляет более старые.
- Если у репозитория ещё не настроен `origin`, сначала нужно привязать его к нужному GitHub-репозиторию, а уже потом пушить `main`.
