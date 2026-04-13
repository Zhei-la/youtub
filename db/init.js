const bcrypt = require('bcryptjs');
const { query } = require('./db');

async function initDb() {
  console.log('[DB] Initializing schema...');

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(64) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'pending',
      is_admin BOOLEAN NOT NULL DEFAULT FALSE,
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      approved_at TIMESTAMPTZ
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS histories (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id VARCHAR(32) NOT NULL,
      title VARCHAR(255) NOT NULL,
      episode INTEGER NOT NULL DEFAULT 1,
      topic TEXT,
      style VARCHAR(32),
      mood VARCHAR(32),
      length VARCHAR(8),
      platform VARCHAR(32),
      character_keyword TEXT,
      parent_id VARCHAR(32),
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_histories_user ON histories(user_id, created_at DESC);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);`);

  // 관리자 계정 자동 생성
  const adminUsername = process.env.ADMIN_USERNAME || 'dud2587';
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.warn('[DB] ADMIN_PASSWORD not set! Admin account will not be created.');
    return;
  }

  const existing = await query('SELECT id FROM users WHERE username = $1', [adminUsername]);
  if (existing.rows.length === 0) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await query(
      `INSERT INTO users (username, password_hash, status, is_admin, approved_at)
       VALUES ($1, $2, 'approved', TRUE, NOW())`,
      [adminUsername, hash]
    );
    console.log('[DB] Admin account created:', adminUsername);
  } else {
    // 관리자 비번이 환경변수랑 다를 수 있으니 항상 동기화
    const hash = await bcrypt.hash(adminPassword, 10);
    await query(
      `UPDATE users SET password_hash = $1, is_admin = TRUE, status = 'approved' WHERE username = $2`,
      [hash, adminUsername]
    );
    console.log('[DB] Admin account synced:', adminUsername);
  }

  console.log('[DB] Schema ready.');
}

module.exports = { initDb };
