const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { verify } = require('../middleware/auth');

// GET all demos (with their activity log attached)
router.get('/', verify, async (req, res) => {
  try {
    const { rows: demos } = await db.query('SELECT * FROM marketing_demos ORDER BY id DESC');
    const ids = demos.map(d => d.id);
    const { rows: activities } = ids.length
      ? await db.query('SELECT * FROM marketing_demo_activities WHERE demo_id = ANY($1) ORDER BY activity_date DESC, id DESC', [ids])
      : { rows: [] };
    const result = demos.map(d => ({ ...d, activities: activities.filter(a => a.demo_id === d.id) }));
    res.json(result);
  } catch (err) {
    console.error('GET /marketing/demos error:', err);
    res.status(500).json({ error: 'Failed to fetch demos' });
  }
});

// POST create demo
router.post('/', verify, async (req, res) => {
  try {
    const { demo_no, customer, contact_person, product, demo_date, type, conducted_by, status, next_follow_up, created_date } = req.body;
    if (!demo_no)   return res.status(400).json({ error: 'Demo number is required' });
    if (!customer)  return res.status(400).json({ error: 'Customer is required' });
    if (!product)   return res.status(400).json({ error: 'Product is required' });
    if (!demo_date) return res.status(400).json({ error: 'Demo date is required' });

    const { rows } = await db.query(`
      INSERT INTO marketing_demos
        (demo_no, customer, contact_person, product, demo_date, type, conducted_by, status, next_follow_up, created_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
    `, [
      demo_no, customer, contact_person || null, product, demo_date, type || null,
      conducted_by || null, status || 'Requested', next_follow_up || null, created_date || null,
    ]);

    res.status(201).json({ ...rows[0], activities: [] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Demo number already exists' });
    console.error('POST /marketing/demos error:', err);
    res.status(500).json({ error: 'Failed to create demo' });
  }
});

// PUT update demo header fields
router.put('/:id', verify, async (req, res) => {
  try {
    const { customer, contact_person, product, demo_date, type, conducted_by, status, next_follow_up } = req.body;
    const { rows } = await db.query(`
      UPDATE marketing_demos SET
        customer=$1, contact_person=$2, product=$3, demo_date=$4, type=$5,
        conducted_by=$6, status=$7, next_follow_up=$8, updated_at=NOW()
      WHERE id=$9 RETURNING *
    `, [customer, contact_person || null, product, demo_date, type || null, conducted_by || null, status || 'Requested', next_follow_up || null, req.params.id]);

    if (!rows[0]) return res.status(404).json({ error: 'Demo not found' });

    const { rows: activities } = await db.query(
      'SELECT * FROM marketing_demo_activities WHERE demo_id = $1 ORDER BY activity_date DESC, id DESC',
      [req.params.id]
    );
    res.json({ ...rows[0], activities });
  } catch (err) {
    console.error('PUT /marketing/demos/:id error:', err);
    res.status(500).json({ error: 'Failed to update demo' });
  }
});

// POST log a follow-up activity — also rolls the demo's next_follow_up/status forward
router.post('/:id/activities', verify, async (req, res) => {
  try {
    const { activity_date, outcome, next_follow_up, note, logged_by } = req.body;
    if (!activity_date) return res.status(400).json({ error: 'Activity date is required' });

    await db.query(`
      INSERT INTO marketing_demo_activities (demo_id, activity_date, outcome, next_follow_up, note, logged_by)
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [req.params.id, activity_date, outcome || null, next_follow_up || null, note || null, logged_by || null]);

    const { rows } = await db.query(`
      UPDATE marketing_demos SET
        next_follow_up = COALESCE($1, next_follow_up),
        status = CASE WHEN $1::date IS NOT NULL THEN 'Follow-Up' ELSE status END,
        updated_at = NOW()
      WHERE id=$2 RETURNING *
    `, [next_follow_up || null, req.params.id]);

    if (!rows[0]) return res.status(404).json({ error: 'Demo not found' });

    const { rows: activities } = await db.query(
      'SELECT * FROM marketing_demo_activities WHERE demo_id = $1 ORDER BY activity_date DESC, id DESC',
      [req.params.id]
    );
    res.status(201).json({ ...rows[0], activities });
  } catch (err) {
    console.error('POST /marketing/demos/:id/activities error:', err);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

// DELETE demo
router.delete('/:id', verify, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM marketing_demos WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Demo not found' });
    res.json({ message: 'Demo deleted' });
  } catch (err) {
    console.error('DELETE /marketing/demos/:id error:', err);
    res.status(500).json({ error: 'Failed to delete demo' });
  }
});

module.exports = router;
