const router = require('express').Router();
const db     = require('../config/db');
const { verify } = require('../middleware/auth');

// POST /api/meetings — create or replace meeting for a project
router.post('/', verify, async (req, res) => {
  try {
    const { project_id, schedule_type, days, meeting_time, reminder_mins, meeting_link } = req.body;
    if (!project_id || !meeting_time || !meeting_link)
      return res.status(400).json({ error: 'project_id, meeting_time and meeting_link are required' });

    // Upsert — one meeting per project
    await db.query(`DELETE FROM project_meetings WHERE project_id = $1`, [project_id]);
    const { rows } = await db.query(`
      INSERT INTO project_meetings (project_id, schedule_type, days, meeting_time, reminder_mins, meeting_link)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [project_id, schedule_type||'Daily', days||'', meeting_time, reminder_mins||30, meeting_link]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/meetings/:projectId
router.get('/:projectId', verify, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM project_meetings WHERE project_id = $1 LIMIT 1`,
      [req.params.projectId]
    );
    res.json(rows[0] || null);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/meetings/:projectId
router.delete('/:projectId', verify, async (req, res) => {
  try {
    await db.query(`DELETE FROM project_meetings WHERE project_id = $1`, [req.params.projectId]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
