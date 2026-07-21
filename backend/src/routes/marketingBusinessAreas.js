const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { verify } = require('../middleware/auth');

// GET all business areas
router.get('/', verify, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM marketing_business_areas ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error('GET /marketing/business-areas error:', err);
    res.status(500).json({ error: 'Failed to fetch business areas' });
  }
});

// POST create business area
router.post('/', verify, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const { rows } = await db.query(
      'INSERT INTO marketing_business_areas (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /marketing/business-areas error:', err);
    res.status(500).json({ error: 'Failed to create business area' });
  }
});

// PUT update business area
router.put('/:id', verify, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const { rows } = await db.query(
      'UPDATE marketing_business_areas SET name=$1 WHERE id=$2 RETURNING *',
      [name.trim(), req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Business area not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /marketing/business-areas/:id error:', err);
    res.status(500).json({ error: 'Failed to update business area' });
  }
});

// DELETE business area
router.delete('/:id', verify, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM marketing_business_areas WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Business area not found' });
    res.json({ message: 'Business area deleted' });
  } catch (err) {
    console.error('DELETE /marketing/business-areas/:id error:', err);
    res.status(500).json({ error: 'Failed to delete business area' });
  }
});

module.exports = router;
