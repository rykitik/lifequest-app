# Деплой LifeQuest

## Current mode: Static PWA deploy

Сейчас `ry-kit.ru` работает как static PWA deploy:

- GitHub Actions собирает только frontend `dist/`;
- архив выкладывается в `/var/www/lifequest/releases`;
- симлинк `/var/www/lifequest/current` указывает на активный релиз;
- системный `nginx` отдаёт `/var/www/lifequest/current`;
- конфиг nginx на VPS: `/etc/nginx/sites-available/lifequest`;
- Docker на VPS не используется;
- backend/API на VPS сейчас не запущен;
- auth/sync выключены в production frontend через `VITE_AUTH_ENABLED=false`;
- LifeQuest должен полностью работать local-first без `/api`.

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
2. Собирает production-версию через `npm run build` с `VITE_AUTH_ENABLED=false` и пустым `VITE_API_URL`.
3. Упаковывает `dist/` в архив.
4. Загружает архив на VPS по SSH.
5. Запускает `scripts/deploy-frontend.sh` на сервере.
6. Скрипт распаковывает релиз в новую папку, обновляет симлинк `current` и делает `nginx reload`.

## Future mode: Full Docker deploy

Этот режим нужен позже, когда backend будет реально поднят:

- `docker-compose.full.yml`;
- frontend nginx container;
- backend container;
- MongoDB container;
- `/api/` проксируется из frontend nginx container в `lifequest-backend:4000`;
- frontend собирается с `VITE_AUTH_ENABLED=true` и `VITE_API_URL=/api`;
- auth/sync остаются optional для пользователя, но backend endpoints становятся доступными.

## Что важно помнить

- На сервере больше не требуется Docker для production-выкладки frontend.
- Для текущего VPS static deploy не нужен `/api` proxy, потому что backend не запущен.
- Скрипт хранит несколько последних релизов и удаляет более старые.
- Если у репозитория ещё не настроен `origin`, сначала нужно привязать его к нужному GitHub-репозиторию, а уже потом пушить `main`.
