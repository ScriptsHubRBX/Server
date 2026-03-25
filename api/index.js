// api/index.js - для Vercel Serverless
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Используем внешнее хранилище (Supabase/Redis) или простой вариант:
// Для теста — храним в глобальной переменной (не идеально, но работает)
global.messages = global.messages || [];
global.currentStream = global.currentStream || null;

app.get('/api/tiktok/set-stream', (req, res) => {
    const { username } = req.query;
    global.currentStream = username;
    global.messages = [];
    res.json({ success: true, username });
});

app.get('/api/tiktok/messages', (req, res) => {
    res.json({ 
        stream: global.currentStream, 
        messages: global.messages 
    });
});

app.post('/api/tiktok/message', (req, res) => {
    const { user, text } = req.body;
    global.messages.push({ user, text, time: Date.now() });
    if (global.messages.length > 100) global.messages.shift();
    res.json({ success: true });
});

// Vercel требует экспорт
module.exports = app;
