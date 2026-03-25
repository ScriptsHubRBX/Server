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
    
    if (type === 'chat') {
        console.log(`💬 ${data.nickname}: ${data.message}`);
    } else if (type === 'connected') {
        console.log(`✅ Подключен к @${data.username}`);
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
            console.log("   Отключил старую сессию");
        } catch(e) {}
    }
    
    currentUsername = username;
    
    // Создаем новое подключение
    tiktokConnection = new WebcastPushConnection(username, {
        processInitialData: true,
        fetchRoomInfoOnConnect: true,
        enableExtendedGiftInfo: true,
        reconnectEnabled: true,
        reconnectDelay: 3000,
        requestHeaders: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });
    
    // Подключаемся
    tiktokConnection.connect()
        .then((state) => {
            isConnected = true;
            console.log(`✅✅✅ ПОДКЛЮЧЕНО! @${username}`);
            console.log(`   Room ID: ${state.roomId}`);
            console.log(`   Зрителей: ${state.viewerCount || '?'}`);
            console.log(`   Стрим активен! Ожидание сообщений...\n`);
            pushEvent("connected", { username, roomId: state.roomId });
        })
        .catch((err) => {
            isConnected = false;
            console.error(`❌❌❌ ОШИБКА ПОДКЛЮЧЕНИЯ: ${err.message}`);
            
            if (err.message.includes("not live")) {
                console.log(`   💡 Стример @${username} не в эфире!`);
            } else if (err.message.includes("not found")) {
                console.log(`   💡 Пользователь @${username} не найден!`);
            } else {
                console.log(`   💡 Проверьте: 1) Стрим идет? 2) Ник правильный?`);
            }
            
            pushEvent("error", { message: err.message });
        });
    
    // Обработчики событий
    tiktokConnection.on("chat", (data) => {
        pushEvent("chat", {
            username: data.uniqueId,
            nickname: data.nickname,
            message: data.comment,
        });
    });
    
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
    
    tiktokConnection.on("like", (data) => {
        pushEvent("like", {
            username: data.uniqueId,
            nickname: data.nickname,
            likeCount: data.likeCount,
        });
    });
    
    tiktokConnection.on("member", (data) => {
        pushEvent("member", {
            username: data.uniqueId,
            nickname: data.nickname,
        });
    });
    
    tiktokConnection.on("follow", (data) => {
        pushEvent("follow", {
            username: data.uniqueId,
            nickname: data.nickname,
        });
    });
    
    tiktokConnection.on("disconnected", () => {
        isConnected = false;
        console.log(`🔌 Отключен от @${username}`);
        pushEvent("disconnected", { username });
    });
}

// API endpoints
app.get("/events", (req, res) => {
    const events = [...eventQueue];
    eventQueue.length = 0;
    res.json({ success: true, events, connected: isConnected });
});

app.post("/connect", (req, res) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).json({ error: "username required" });
    }
    console.log(`\n📡 ПОЛУЧЕН ЗАПРОС НА ПОДКЛЮЧЕНИЕ К @${username}`);
    connectToTikTok(username);
    res.json({ success: true, message: `Connecting to @${username}` });
});

app.get("/status", (req, res) => {
    res.json({
        connected: isConnected,
        username: currentUsername,
        queueSize: eventQueue.length,
        uptime: process.uptime(),
    });
});

app.get("/", (req, res) => {
    res.send("TikTok-Roblox Bridge Server is running! Use /status to check connection");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📡 URL: https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost'}`);
    console.log(`\n💡 Чтобы подключиться к стримеру, отправьте POST запрос:`);
    console.log(`   curl -X POST https://ваш-сервер.onrender.com/connect -H "Content-Type: application/json" -d '{"username":"tiktok_username"}'`);
    console.log(`\n📺 ИЛИ установите переменную окружения TIKTOK_USERNAME`);
    console.log(`   Пример: TIKTOK_USERNAME=charlidamelio npm start\n`);
});

// Автоподключение если задан USERNAME в переменных окружения
if (process.env.TIKTOK_USERNAME) {
    connectToTikTok(process.env.TIKTOK_USERNAME);
}
