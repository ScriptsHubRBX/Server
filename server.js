const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors()); // Разрешаем запросы откуда угодно (для Roblox)
app.use(express.json());

// Хранилище сообщений (в памяти)
let messages = [];
let currentStream = null;

// Подключение к TikTok стриму
app.get('/api/tiktok/set-stream', (req, res) => {
    const { username } = req.query;
    currentStream = username;
    messages = []; // Очищаем старые сообщения
    console.log('Подключён к:', username);
    res.json({ success: true, username });
});

// Получение сообщений
app.get('/api/tiktok/messages', (req, res) => {
    res.json({ 
        stream: currentStream,
        messages: messages 
    });
});

// Добавление сообщения (эмуляция TikTok)
app.post('/api/tiktok/message', (req, res) => {
    const { user, text } = req.body;
    messages.push({ user, text, time: Date.now() });
    // Храним только последние 100 сообщений
    if (messages.length > 100) messages.shift();
    res.json({ success: true });
});

// Для теста - добавить фейковое сообщение
app.get('/api/tiktok/test', (req, res) => {
    messages.push({ 
        user: 'TestUser', 
        text: 'Привет из TikTok! ' + Date.now(),
        time: Date.now() 
    });
    res.json({ added: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Server running on port', PORT);
});
