# TikTok Live → Roblox Bridge

## Структура файлов

```
server.js          → Node.js сервер (запускается на вашем ПК)
TikTokService.lua  → ServerScript в Roblox (ServerScriptService)
TikTokUI.lua       → LocalScript в Roblox (StarterPlayerScripts)
```

## Установка (Node.js сервер)

```bash
npm install
node server.js
```

## Подключение к TikTok трансляции

```bash
curl -X POST http://localhost:3000/connect \
  -H "Content-Type: application/json" \
  -d '{"username": "ваш_тикток_ник"}'
```

## Настройка Roblox

1. **Включить HTTP запросы**: Game Settings → Security → Allow HTTP Requests ✅
2. **TikTokService.lua** → поместить в `ServerScriptService`
3. **TikTokUI.lua** → поместить в `StarterPlayerScripts`
4. В `TikTokService.lua` заменить `SERVER_URL` на IP вашего компьютера

## Если нужен публичный IP (Roblox серверы не могут достучаться до localhost)

Используйте ngrok:
```bash
npx ngrok http 3000
# Скопируйте https://xxxx.ngrok.io и вставьте в SERVER_URL
```

## API эндпоинты

| Метод | URL | Описание |
|-------|-----|----------|
| GET | /events | Забрать очередь событий |
| POST | /connect | Подключиться к трансляции |
| GET | /status | Статус подключения |

## Типы событий

- `gift` — подарок (username, nickname, giftName, giftCount, totalDiamonds)
- `chat` — сообщение (username, nickname, message)
- `like` — лайк (username, nickname, likeCount)
- `member` — новый зритель (username, nickname)
- `follow` — подписка (username, nickname)
- `viewers` — количество зрителей (count)
