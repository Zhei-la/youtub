const jwt = require('jsonwebtoken');
const { query } = require('../db/db');

const JWT_SECRET = process.env.JWT_SECRET || 'shortsforge-dev-secret-change-me';

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, is_admin: user.is_admin },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

async function requireAuth(req, res, next) {
  const token = req.cookies?.sf_token;
  if (!token) return res.status(401).json({ error: '로그인이 필요합니다' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const { rows } = await query(
      'SELECT id, username, status, is_admin FROM users WHERE id = $1',
      [payload.id]
    );
    if (rows.length === 0) return res.status(401).json({ error: '사용자 없음' });
    if (rows[0].status !== 'approved') {
      return res.status(403).json({ error: '승인되지 않은 계정입니다' });
    }
    req.user = rows[0];
    next();
  } catch (e) {
    return res.status(401).json({ error: '유효하지 않은 토큰' });
  }
}

async function requireAdmin(req, res, next) {
  await requireAuth(req, res, () => {
    if (!req.user || !req.user.is_admin) {
      return res.status(403).json({ error: '관리자 권한이 필요합니다' });
    }
    next();
  });
}

module.exports = { signToken, requireAuth, requireAdmin, JWT_SECRET };
