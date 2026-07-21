const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { verify } = require('../middleware/auth');

// GET all demo types
router.get('/', verify, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM marketing_demo_types ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error('GET /marketing/demo-types error:', err);
    res.status(500).json({ error: 'Failed to fetch demo types' });
  }
});

// POST create demo type
router.post('/', verify, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const { rows } = await db.query(
      'INSERT INTO marketing_demo_types (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /marketing/demo-types error:', err);
    res.status(500).json({ error: 'Failed to create demo type' });
  }
});

// PUT update demo type
router.put('/:id', verify, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const { rows } = await db.query(
      'UPDATE marketing_demo_types SET name=$1 WHERE id=$2 RETURNING *',
      [name.trim(), req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Demo type not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /marketing/demo-types/:id error:', err);
    res.status(500).json({ error: 'Failed to update demo type' });
  }
});

// DELETE demo type
router.delete('/:id', verify, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM marketing_demo_types WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Demo type not found' });
    res.json({ message: 'Demo type deleted' });
  } catch (err) {
    console.error('DELETE /marketing/demo-types/:id error:', err);
    res.status(500).json({ error: 'Failed to delete demo type' });
  }
});

module.exports = router;
