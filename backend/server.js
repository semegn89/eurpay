// backend/server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Если есть .env — можно раскомментировать следующую строку
// require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Прямо укажем строку подключения (или через .env)
const MONGO_URI = process.env.MONGO_URI ||
  'mongodb+srv://llctvtrussia:hXGw2jtjhyT3wlOr@cluster0.thijgmk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Middleware
app.use(cors());
app.use(express.json());

// Подключи все роуты, которые есть у тебя в backend/routes
app.use('/api/auth', require('./routes/authRoutes'));
// app.use('/api/users', require('./routes/usersRoutes'));
// app.use('/api/payments', require('./routes/paymentsRoutes'));
// app.use('/api/requests', require('./routes/requestRoutes'));
// app.use('/api/docs', require('./routes/docsRoutes'));

// Проверочный route (можно удалить)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// MongoDB connection и запуск сервера
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('✅ MongoDB connected');
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1); // не запускать сервер без базы
});
