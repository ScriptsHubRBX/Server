const { WebcastPushConnection } = require("tiktok-live-connector");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const eventQueue = [];

function pushEvent(type, data) {
  eventQueue.push({ type, data, timestamp: Date.now() });
  if (eventQueue.length > 200) eventQueue.shift();

  if (type === "chat") {
    console.log(`💬 ${data.nickname} (@${data.username}): ${data.message}`);
  } else if (type === "gift") {
    console.log(`🎁 ${data.nickname} (@${data.username}) подарил ${data.giftName} x${data.giftCount} (${data.diamondCount} 💎)`);
  } else if (type === "like") {
    console.log(`❤️  ${data.nickname} (@${data.username}) поставил ${data.likeCount} лайков`);
  } else if (type === "member") {
    console.log(`👋 ${data.nickname} (@${data.username}) зашёл на стрим`);
  } else if (type === "follow") {
    console.log(`➕ ${data.nickname} (@${data.username}) подписался!`);
  } else if (type === "connected") {
    console.log(`✅ Подключено к @${data.username} | Room: ${data.roomId} | Зрителей: ${data.viewerCount}`);
  } else if (type === "disconnected") {
    console.log(`🔌 Отключено от @${data.username}`);
  } else if (type === "error") {
    console.log(`❌ Ошибка: ${data.message}`);
  }
}

let tiktokConnection = null;
let currentUsername = null;
let isConnected = false;

function connectToTikTok(username) {
  console.log(`\n🔌 Подключаюсь к @${username}...`);

  if (tiktokConnection) {
    try {
      tiktokConnection.disconnect();
      console.log("  Отключил старую сессию");
    } catch (e) {}
  }

  currentUsername = username;
  isConnected = false;

  tiktokConnection = new WebcastPushConnection(username, {
    processInitialData: true,
    fetchRoomInfoOnConnect: true,
    enableExtendedGiftInfo: true,
    reconnectEnabled: true,
    reconnectDelay: 3000,
    requestHeaders: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  tiktokConnection
    .connect()
    .then((state) => {
      isConnected = true;
      pushEvent("connected", {
        username,
        roomId: state.roomId,
        viewerCount: state.viewerCount || 0,
      });
    })
    .catch((err) => {
      isConnected = false;
      if (err.message.includes("not live")) {
        console.log(`  💡 @${username} сейчас не в эфире`);
      } else if (err.message.includes("not found")) {
        console.log(`  💡 Пользователь @${username} не найден`);
      } else {
        console.log(`  💡 Ошибка: ${err.message}`);
      }
      pushEvent("error", { message: err.message });
    });

  // 💬 Сообщения в чате
  tiktokConnection.on("chat", (data) => {
    pushEvent("chat", {
      username: data.uniqueId,
      nickname: data.nickname,
      message: data.comment,
      followRole: data.followRole,   // 0 = не подписан, 1 = подписан, 2 = друг
      isSubscriber: data.isSubscriber || false,
    });
  });

  // 🎁 Подарки
  tiktokConnection.on("gift", (data) => {
    if (data.giftType === 1 && !data.repeatEnd) return;
    pushEvent("gift", {
      username: data.uniqueId,
      nickname: data.nickname,
      giftName: data.giftName,
      giftCount: data.repeatCount || 1,
      diamondCount: data.diamondCount || 0,
    });
  });

  // ❤️ Лайки
  tiktokConnection.on("like", (data) => {
    pushEvent("like", {
      username: data.uniqueId,
      nickname: data.nickname,
      likeCount: data.likeCount,
      totalLikeCount: data.totalLikeCount || 0,
    });
  });

  // 👋 Кто зашёл на стрим
  tiktokConnection.on("member", (data) => {
    pushEvent("member", {
      username: data.uniqueId,
      nickname: data.nickname,
      followRole: data.followRole,
    });
  });

  // ➕ Подписался
  tiktokConnection.on("follow", (data) => {
    pushEvent("follow", {
      username: data.uniqueId,
      nickname: data.nickname,
    });
  });

  // 🔌 Отключился
  tiktokConnection.on("disconnected", () => {
    isConnected = false;
    pushEvent("disconnected", { username });
  });
}

// ─── Эндпоинты ───────────────────────────────────────────

// Подключиться к стримеру
app.post("/connect", (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "username required" });
  connectToTikTok(username);
  res.json({ success: true, message: `Connecting to @${username}` });
});

// Получить все новые события (очередь очищается)
app.get("/events", (req, res) => {
  const events = [...eventQueue];
  eventQueue.length = 0;
  res.json({ success: true, events, connected: isConnected });
});

// Статус сервера
app.get("/status", (req, res) => {
  res.json({
    connected: isConnected,
    username: currentUsername,
    queueSize: eventQueue.length,
    uptime: process.uptime(),
  });
});

app.get("/", (req, res) => {
  res.send("TikTok Bridge работает! Используй /status для проверки.");
});

// ─── Запуск ──────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Сервер запущен на порту ${PORT}`);
  console.log(`\n💡 Чтобы подключиться к стримеру:`);
  console.log(`   curl -X POST https://ваш-сервер.onrender.com/connect \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -d '{"username":"tiktok_username"}'\n`);
});

if (process.env.TIKTOK_USERNAME) {
  connectToTikTok(process.env.TIKTOK_USERNAME);
}
