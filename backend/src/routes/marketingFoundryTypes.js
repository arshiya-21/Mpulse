const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { verify } = require('../middleware/auth');

// GET all foundry types
router.get('/', verify, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM marketing_foundry_types ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error('GET /marketing/foundry-types error:', err);
    res.status(500).json({ error: 'Failed to fetch foundry types' });
  }
});

// POST create foundry type
router.post('/', verify, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const { rows } = await db.query(
      'INSERT INTO marketing_foundry_types (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /marketing/foundry-types error:', err);
    res.status(500).json({ error: 'Failed to create foundry type' });
  }
});

// PUT update foundry type
router.put('/:id', verify, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const { rows } = await db.query(
      'UPDATE marketing_foundry_types SET name=$1 WHERE id=$2 RETURNING *',
      [name.trim(), req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Foundry type not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /marketing/foundry-types/:id error:', err);
    res.status(500).json({ error: 'Failed to update foundry type' });
  }
});

// DELETE foundry type
router.delete('/:id', verify, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM marketing_foundry_types WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Foundry type not found' });
    res.json({ message: 'Foundry type deleted' });
  } catch (err) {
    console.error('DELETE /marketing/foundry-types/:id error:', err);
    res.status(500).json({ error: 'Failed to delete foundry type' });
  }
});

module.exports = router;
