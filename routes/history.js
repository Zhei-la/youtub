const express = require('express');
const { query } = require('../db/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// 목록
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, project_id, title, episode, topic, style, mood, length, platform,
              character_keyword, parent_id, data, created_at
       FROM histories
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 500`,
      [req.user.id]
    );
    res.json({ histories: rows });
  } catch (e) {
    console.error('[history list]', e);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 저장 (upsert by project_id + user_id)
router.post('/', requireAuth, async (req, res) => {
  try {
    const p = req.body || {};
    if (!p.id || !p.title) return res.status(400).json({ error: '잘못된 데이터' });

    // 동일 project_id 있으면 UPDATE
    const existing = await query(
      'SELECT id FROM histories WHERE user_id = $1 AND project_id = $2',
      [req.user.id, p.id]
    );

    if (existing.rows.length > 0) {
      await query(
        `UPDATE histories SET
           title=$1, episode=$2, topic=$3, style=$4, mood=$5, length=$6,
           platform=$7, character_keyword=$8, parent_id=$9, data=$10
         WHERE user_id=$11 AND project_id=$12`,
        [
          p.title, p.episode || 1, p.topic || '', p.style || '', p.mood || '',
          String(p.length || ''), p.platform || '', p.character || '',
          p.parentId || null, JSON.stringify(p),
          req.user.id, p.id
        ]
      );
      return res.json({ ok: true, updated: true });
    }

    await query(
      `INSERT INTO histories
       (user_id, project_id, title, episode, topic, style, mood, length, platform, character_keyword, parent_id, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        req.user.id, p.id, p.title, p.episode || 1, p.topic || '',
        p.style || '', p.mood || '', String(p.length || ''), p.platform || '',
        p.character || '', p.parentId || null, JSON.stringify(p)
      ]
    );
    res.json({ ok: true, created: true });
  } catch (e) {
    console.error('[history save]', e);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 삭제
router.delete('/:projectId', requireAuth, async (req, res) => {
  try {
    await query(
      'DELETE FROM histories WHERE user_id = $1 AND project_id = $2',
      [req.user.id, req.params.projectId]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('[history delete]', e);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 전체 삭제
router.delete('/', requireAuth, async (req, res) => {
  try {
    await query('DELETE FROM histories WHERE user_id = $1', [req.user.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error('[history delete all]', e);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
