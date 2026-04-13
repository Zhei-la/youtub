const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../db/db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// 사용자 목록 (status 필터 옵션)
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `SELECT u.id, u.username, u.status, u.is_admin, u.note, u.created_at, u.approved_at,
                      COALESCE((SELECT COUNT(*) FROM histories h WHERE h.user_id = u.id), 0) AS history_count
               FROM users u`;
    const params = [];
    if (status && ['pending','approved','rejected'].includes(status)) {
      sql += ' WHERE u.status = $1';
      params.push(status);
    }
    sql += ' ORDER BY u.created_at DESC';
    const { rows } = await query(sql, params);
    res.json({ users: rows });
  } catch (e) {
    console.error('[admin users]', e);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 통계
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE status='pending') AS pending,
        (SELECT COUNT(*) FROM users WHERE status='approved') AS approved,
        (SELECT COUNT(*) FROM users WHERE status='rejected') AS rejected,
        (SELECT COUNT(*) FROM histories) AS total_histories
    `);
    res.json({ stats: stats.rows[0] });
  } catch (e) {
    console.error('[admin stats]', e);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 승인
router.post('/users/:id/approve', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await query(
      `UPDATE users SET status = 'approved', approved_at = NOW() WHERE id = $1`,
      [id]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('[admin approve]', e);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 거부
router.post('/users/:id/reject', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await query(`UPDATE users SET status = 'rejected' WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('[admin reject]', e);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 상태 복구 (rejected/approved 토글)
router.post('/users/:id/revoke', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (id === req.user.id) return res.status(400).json({ error: '자기 자신은 차단할 수 없습니다' });
    await query(`UPDATE users SET status = 'rejected' WHERE id = $1 AND is_admin = FALSE`, [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('[admin revoke]', e);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 사용자 추가 (관리자가 직접)
router.post('/users', requireAdmin, async (req, res) => {
  try {
    const { username, password, note } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: '아이디/비밀번호 필수' });
    if (password.length < 6) return res.status(400).json({ error: '비밀번호 6자 이상' });

    const existing = await query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) return res.status(409).json({ error: '이미 존재하는 아이디' });

    const hash = await bcrypt.hash(password, 10);
    await query(
      `INSERT INTO users (username, password_hash, status, approved_at, note)
       VALUES ($1, $2, 'approved', NOW(), $3)`,
      [username, hash, (note || '').slice(0, 500)]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('[admin create user]', e);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 사용자 삭제
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (id === req.user.id) return res.status(400).json({ error: '자기 자신은 삭제할 수 없습니다' });
    const { rows } = await query('SELECT is_admin FROM users WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: '없는 사용자' });
    if (rows[0].is_admin) return res.status(400).json({ error: '관리자는 삭제할 수 없습니다' });
    await query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('[admin delete user]', e);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 비밀번호 초기화
router.post('/users/:id/reset-password', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { password } = req.body || {};
    if (!password || password.length < 6) return res.status(400).json({ error: '비밀번호 6자 이상' });
    const hash = await bcrypt.hash(password, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('[admin reset pw]', e);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
