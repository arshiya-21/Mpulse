const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { verify } = require('../middleware/auth');

// GET progress rows for an order (?order_id=X)
router.get('/', verify, async (req, res) => {
  try {
    const { order_id } = req.query;
    if (!order_id) return res.status(400).json({ error: 'order_id is required' });
    const { rows } = await db.query(
      'SELECT * FROM marketing_implementation_progress WHERE order_id = $1 ORDER BY phase_number',
      [order_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /marketing/implementation-progress error:', err);
    res.status(500).json({ error: 'Failed to fetch implementation progress' });
  }
});

// PUT upsert progress for one order+phase
router.put('/', verify, async (req, res) => {
  try {
    const { order_id, phase_number, status, done_steps, start_date, end_date, responsible_person, notes, documents } = req.body;
    if (!order_id)            return res.status(400).json({ error: 'order_id is required' });
    if (phase_number == null) return res.status(400).json({ error: 'phase_number is required' });

    const { rows } = await db.query(`
      INSERT INTO marketing_implementation_progress
        (order_id, phase_number, status, done_steps, start_date, end_date, responsible_person, notes, documents)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (order_id, phase_number) DO UPDATE SET
        status=$3, done_steps=$4, start_date=$5, end_date=$6, responsible_person=$7, notes=$8, documents=$9, updated_at=NOW()
      RETURNING *
    `, [
      order_id, phase_number, status || 'Not Started', done_steps || [],
      start_date || null, end_date || null, responsible_person || null, notes || null, documents || [],
    ]);

    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /marketing/implementation-progress error:', err);
    res.status(500).json({ error: 'Failed to save implementation progress' });
  }
});

module.exports = router;
