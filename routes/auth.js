const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../db/db');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT,
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000
};

function validateUsername(u) {
  if (!u || typeof u !== 'string') return '아이디를 입력하세요';
  if (u.length < 3 || u.length > 32) return '아이디는 3~32자여야 합니다';
  if (!/^[a-zA-Z0-9_]+$/.test(u)) return '아이디는 영문/숫자/언더스코어만 가능합니다';
  return null;
}
function validatePassword(p) {
  if (!p || typeof p !== 'string') return '비밀번호를 입력하세요';
  if (p.length < 6) return '비밀번호는 6자 이상이어야 합니다';
  return null;
}

// 가입 신청
router.post('/signup', async (req, res) => {
  try {
    const { username, password, note } = req.body || {};
    const ue = validateUsername(username);
    if (ue) return res.status(400).json({ error: ue });
    const pe = validatePassword(password);
    if (pe) return res.status(400).json({ error: pe });

    const existing = await query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: '이미 사용 중인 아이디입니다' });
    }

    const hash = await bcrypt.hash(password, 10);
    await query(
      `INSERT INTO users (username, password_hash, status, note)
       VALUES ($1, $2, 'pending', $3)`,
      [username, hash, (note || '').slice(0, 500)]
    );

    res.json({ ok: true, message: '가입 신청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.' });
  } catch (e) {
    console.error('[signup]', e);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 로그인
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: '아이디와 비밀번호를 입력하세요' });
    }

    const { rows } = await query(
      'SELECT id, username, password_hash, status, is_admin FROM users WHERE username = $1',
      [username]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 틀렸습니다' });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 틀렸습니다' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({ error: '아직 관리자 승인 대기 중입니다' });
    }
    if (user.status === 'rejected') {
      return res.status(403).json({ error: '승인이 거부된 계정입니다' });
    }
    if (user.status !== 'approved') {
      return res.status(403).json({ error: '사용할 수 없는 계정입니다' });
    }

    const token = signToken(user);
    res.cookie('sf_token', token, COOKIE_OPTS);
    res.json({
      ok: true,
      user: { id: user.id, username: user.username, is_admin: user.is_admin }
    });
  } catch (e) {
    console.error('[login]', e);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 로그아웃
router.post('/logout', (req, res) => {
  res.clearCookie('sf_token', COOKIE_OPTS);
  res.json({ ok: true });
});

// 현재 사용자
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// 비밀번호 변경
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { current, next: nextPw } = req.body || {};
    const pe = validatePassword(nextPw);
    if (pe) return res.status(400).json({ error: pe });

    const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const ok = await bcrypt.compare(current || '', rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: '현재 비밀번호가 틀렸습니다' });

    const hash = await bcrypt.hash(nextPw, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('[change-password]', e);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
