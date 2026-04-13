require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const { initDb } = require('./db/init');

const authRoutes = require('./routes/auth');
const historyRoutes = require('./routes/history');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// 로그
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) return next();
  const t = Date.now();
  res.on('finish', () => {
    console.log(`[${res.statusCode}] ${req.method} ${req.path} ${Date.now() - t}ms`);
  });
  next();
});

// 라우트
app.use('/api/auth', authRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/admin', adminRoutes);

// 헬스체크
app.get('/api/health', (req, res) => res.json({ ok: true, time: Date.now() }));

// 정적 파일
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error('[server error]', err);
  res.status(500).json({ error: '서버 오류' });
});

// 서버 시작
async function start() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`[ShortsForge] Server running on port ${PORT}`);
      console.log(`[ShortsForge] Admin username: ${process.env.ADMIN_USERNAME || 'dud2587'}`);
    });
  } catch (e) {
    console.error('[ShortsForge] Failed to start:', e);
    process.exit(1);
  }
}

start();
