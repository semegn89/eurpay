// chats.js

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
// Разрешаем кросс-доменные запросы
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",        // Подставьте конкретный домен в проде
    methods: ["GET","POST"]
  }
});

// В памяти храним историю чатов по email.
// Для локальной разработки эмулируем "сохранение в файл" (см. комментарии ниже).
let adminChats = {};

// Для эмуляции хранения в файле (только для локальной разработки):
// const fs = require('fs');
// const CHAT_FILE = './local_chats.json';

// При запуске можно попытаться загрузить историю из файла (опционально):
// try {
//   if (fs.existsSync(CHAT_FILE)) {
//     adminChats = JSON.parse(fs.readFileSync(CHAT_FILE, 'utf8'));
//     console.log('История чатов загружена из файла');
//   }
// } catch (err) {
//   console.warn('Не удалось загрузить историю чатов:', err);
// }

// Функция для эмуляции сохранения истории в файл (только для локальной разработки)
function saveChatsToFile() {
  // Для реального сохранения раскомментируйте:
  // fs.writeFileSync(CHAT_FILE, JSON.stringify(adminChats, null, 2));
}

// Обработка WebSocket-соединений
io.on('connection', socket => {
  console.log(`Новый клиент подключен: ${socket.id}`);

  // Клиент просит присоединиться к «комнате» по email
  socket.on('joinChat', userEmail => {
    socket.join(userEmail);
    console.log(`Socket ${socket.id} присоединился к комнате ${userEmail}`);
    // При подключении можно сразу отдать историю сообщений (структурированные объекты)
    if (Array.isArray(adminChats[userEmail])) {
      socket.emit('chatHistory', adminChats[userEmail]);
    }
  });

  // Приход нового сообщения
  socket.on('sendMessage', data => {
    const { userEmail, message } = data;
    if (!userEmail || !message) return;

    // Формируем структурированный объект сообщения:
    // from: 'admin' или 'user', text: строка, timestamp: ISO, read: булево
    const msgObj = {
      from: message.from || 'user', // или 'admin'
      text: message.text || '',
      timestamp: message.timestamp || new Date().toISOString(),
      read: !!message.read
    };

    // Инициализируем массив, если нужно
    if (!adminChats[userEmail]) {
      adminChats[userEmail] = [];
    }
    adminChats[userEmail].push(msgObj);

    // Эмулируем сохранение в файл (для локалки)
    saveChatsToFile();

    // Шлём всем в комнате новое сообщение в виде объекта
    io.to(userEmail).emit('newMessage', msgObj);
  });

  socket.on('disconnect', () => {
    console.log(`Клиент отключился: ${socket.id}`);
  });
});

// REST API на случай, если вы хотите «достать» историю через HTTP
app.get('/chats', (req, res) => {
  // Возвращаем всю историю чатов (по пользователям), где каждое сообщение — объект {from, text, timestamp, read}
  res.json(adminChats);
});

app.post('/chats', (req, res) => {
  const { userEmail, message } = req.body;
  if (!userEmail || !message) {
    return res.status(400).json({ error: 'userEmail и message обязательны' });
  }
  // Формируем структурированный объект сообщения:
  const msgObj = {
    from: message.from || 'user', // или 'admin'
    text: message.text || '',
    timestamp: message.timestamp || new Date().toISOString(),
    read: !!message.read
  };
  if (!adminChats[userEmail]) {
    adminChats[userEmail] = [];
  }
  adminChats[userEmail].push(msgObj);
  saveChatsToFile();
  // также пушим через сокеты, если кто-то в комнате:
  io.to(userEmail).emit('newMessage', msgObj);
  res.status(201).json({ status: 'OK' });
});

// Запускаем сервер
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Chat-сервер запущен на порту ${PORT}`);
});

/**
 * === Как реализовать локальное хранение истории чата на клиенте (фронтенд) ===
 *
 * Для локальной разработки вы можете хранить историю сообщений в localStorage или IndexedDB.
 * Пример для localStorage:
 *
 * // При получении истории с сервера:
 * socket.on('chatHistory', (history) => {
 *   localStorage.setItem('chatHistory_' + userEmail, JSON.stringify(history));
 *   // обновите UI
 * });
 *
 * // При получении нового сообщения:
 * socket.on('newMessage', (msg) => {
 *   let arr = JSON.parse(localStorage.getItem('chatHistory_' + userEmail) || '[]');
 *   arr.push(msg);
 *   localStorage.setItem('chatHistory_' + userEmail, JSON.stringify(arr));
 *   // обновите UI
 * });
 *
 * // При отправке сообщения:
 * function sendMessage(text, from = 'user') {
 *   const msg = {
 *     from,
 *     text,
 *     timestamp: new Date().toISOString(),
 *     read: false
 *   };
 *   socket.emit('sendMessage', { userEmail, message: msg });
 *   // Можно сразу добавить в localStorage для мгновенного UI-отклика
 * }
 *
 * // Для продакшена используйте полноценное серверное хранение!
 */