const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway')
    ? { rejectUnauthorized: false }
    : false
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err);
});

async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 500) {
      console.log('[DB slow]', { text: text.slice(0, 80), duration, rows: res.rowCount });
    }
    return res;
  } catch (e) {
    console.error('[DB error]', text.slice(0, 80), e.message);
    throw e;
  }
}

module.exports = { pool, query };
