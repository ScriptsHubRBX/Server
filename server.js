// TikTok → Roblox Bridge Server
// Установка: npm install @tiktoklive/connector express cors

const { WebcastPushConnection } = require("tiktok-live-connector");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ─── Очередь событий ───────────────────────────────────────────────────────
// Roblox будет опрашивать сервер и забирать события
const eventQueue = [];
const MAX_QUEUE = 200;

function pushEvent(type, data) {
  if (eventQueue.length >= MAX_QUEUE) eventQueue.shift(); // удаляем старые
  eventQueue.push({ type, data, timestamp: Date.now() });
}

// ─── TikTok подключение ────────────────────────────────────────────────────
let tiktokConnection = null;
let currentUsername = null;
let isConnected = false;

function connectToTikTok(username) {
  if (tiktokConnection) {
    tiktokConnection.disconnect();
  }

  currentUsername = username;
  tiktokConnection = new WebcastPushConnection(username, {
    processInitialData: false,
    fetchRoomInfoOnConnect: true,
    enableExtendedGiftInfo: true,
    reconnectEnabled: true,
    reconnectDelay: 1000,
  });

  // ── Подключение ──
  tiktokConnection.connect().then((state) => {
    isConnected = true;
    console.log(`✅ Подключён к трансляции @${username} | RoomID: ${state.roomId}`);
    pushEvent("connected", { username, roomId: state.roomId });
  }).catch((err) => {
    isConnected = false;
    console.error("❌ Ошибка подключения:", err.message);
    pushEvent("error", { message: err.message });
  });

  tiktokConnection.on("disconnected", () => {
    isConnected = false;
    console.log("🔌 Отключён от TikTok");
    pushEvent("disconnected", { username });
  });

  // ── Подарки 🎁 ──
  tiktokConnection.on("gift", (data) => {
    // Только завершённые подарки (не стримы монет)
    if (data.giftType === 1 && !data.repeatEnd) return;

    const event = {
      username:    data.uniqueId,
      nickname:    data.nickname,
      giftName:    data.giftName,
      giftId:      data.giftId,
      giftCount:   data.repeatCount || 1,
      diamondCount: data.diamondCount || 0,
      totalDiamonds: (data.diamondCount || 0) * (data.repeatCount || 1),
      pictureUrl:  data.giftPictureUrl || "",
    };

    console.log(`🎁 Подарок: ${event.username} → ${event.giftName} x${event.giftCount}`);
    pushEvent("gift", event);
  });

  // ── Чат 💬 ──
  tiktokConnection.on("chat", (data) => {
    const event = {
      username: data.uniqueId,
      nickname: data.nickname,
      message:  data.comment,
    };

    console.log(`💬 Чат: ${event.nickname}: ${event.message}`);
    pushEvent("chat", event);
  });

  // ── Лайки ❤️ ──
  tiktokConnection.on("like", (data) => {
    const event = {
      username:   data.uniqueId,
      nickname:   data.nickname,
      likeCount:  data.likeCount,
      totalLikes: data.totalLikeCount,
    };
    pushEvent("like", event);
  });

  // ── Новый зритель 👁 ──
  tiktokConnection.on("member", (data) => {
    const event = {
      username: data.uniqueId,
      nickname: data.nickname,
      action:   "joined",
    };
    pushEvent("member", event);
  });

  // ── Подписка ⭐ ──
  tiktokConnection.on("follow", (data) => {
    const event = {
      username: data.uniqueId,
      nickname: data.nickname,
    };
    pushEvent("follow", event);
  });

  // ── Статистика трансляции ──
  tiktokConnection.on("roomUser", (data) => {
    pushEvent("viewers", { count: data.viewerCount });
  });
}

// ─── API маршруты ──────────────────────────────────────────────────────────

// Roblox вызывает этот endpoint, чтобы забрать события
app.get("/events", (req, res) => {
  const events = [...eventQueue];
  eventQueue.length = 0; // очищаем после отправки
  res.json({ success: true, events, connected: isConnected });
});

// Подключиться к трансляции (можно вызвать через Roblox или вручную)
app.post("/connect", (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "username required" });

  connectToTikTok(username);
  res.json({ success: true, message: `Connecting to @${username}` });
});

// Статус сервера
app.get("/status", (req, res) => {
  res.json({
    connected: isConnected,
    username:  currentUsername,
    queueSize: eventQueue.length,
    uptime:    process.uptime(),
  });
});

// ─── Запуск ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
  console.log(`📡 Roblox должен опрашивать: http://YOUR_IP:${PORT}/events`);
  console.log(`\nПодключение к TikTok:`);
  console.log(`  POST http://localhost:${PORT}/connect`);
  console.log(`  Body: { "username": "tiktok_username" }`);
});

// Авто-подключение если задан USERNAME в переменных окружения
if (process.env.TIKTOK_USERNAME) {
  connectToTikTok(process.env.TIKTOK_USERNAME);
}
