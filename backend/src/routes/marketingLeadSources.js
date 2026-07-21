const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { verify } = require('../middleware/auth');

// GET all lead sources
router.get('/', verify, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM marketing_lead_sources ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error('GET /marketing/lead-sources error:', err);
    res.status(500).json({ error: 'Failed to fetch lead sources' });
  }
});

// POST create lead source
router.post('/', verify, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const { rows } = await db.query(
      'INSERT INTO marketing_lead_sources (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /marketing/lead-sources error:', err);
    res.status(500).json({ error: 'Failed to create lead source' });
  }
});

// PUT update lead source
router.put('/:id', verify, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const { rows } = await db.query(
      'UPDATE marketing_lead_sources SET name=$1 WHERE id=$2 RETURNING *',
      [name.trim(), req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Lead source not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /marketing/lead-sources/:id error:', err);
    res.status(500).json({ error: 'Failed to update lead source' });
  }
});

// DELETE lead source
router.delete('/:id', verify, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM marketing_lead_sources WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Lead source not found' });
    res.json({ message: 'Lead source deleted' });
  } catch (err) {
    console.error('DELETE /marketing/lead-sources/:id error:', err);
    res.status(500).json({ error: 'Failed to delete lead source' });
  }
});

module.exports = router;