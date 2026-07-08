const router = require('express').Router();
const db     = require('../config/db');
const { verify, requireRole } = require('../middleware/auth');

// GET unread for current user
router.get('/unread', verify, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT a.* FROM announcements a
      WHERE a.id NOT IN (
        SELECT announcement_id FROM announcement_reads WHERE user_id = $1
      )
      ORDER BY a.created_at DESC
    `, [req.user.userId]);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET all (admin view)
router.get('/', verify, async (_req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM announcements ORDER BY created_at DESC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST create (admin only)
router.post('/', verify, requireRole('Admin'), async (req, res) => {
  try {
    const { title, message, type } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'title and message required' });
    const { rows } = await db.query(
      'INSERT INTO announcements (title,message,type,created_by) VALUES ($1,$2,$3,$4) RETURNING *',
      [title, message, type || 'feature', req.user.name || 'Admin']
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST mark as read
router.post('/:id/read', verify, async (req, res) => {
  try {
    await db.query(
      'INSERT INTO announcement_reads (user_id,announcement_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.user.userId, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE (admin only)
router.delete('/:id', verify, requireRole('Admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM announcements WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;