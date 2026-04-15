const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { verify } = require('../middleware/auth');

// GET all licenses
router.get('/', verify, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT l.*, COUNT(c.id) AS customer_count
      FROM licenses l
      LEFT JOIN customers c ON c.license_id = l.id
      GROUP BY l.id
      ORDER BY l.name
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /licenses error:', err);
    res.status(500).json({ error: 'Failed to fetch licenses' });
  }
});

// GET single license
router.get('/:id', verify, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM licenses WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'License not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /licenses/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch license' });
  }
});

// POST create license
router.post('/', verify, async (req, res) => {
  try {
    const { name, description, price, duration_months, features, status } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const { rows } = await db.query(`
      INSERT INTO licenses (name, description, price, duration_months, features, status)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [name, description||null, price||0, duration_months||12, features||null, status||'active']);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /licenses error:', err);
    res.status(500).json({ error: 'Failed to create license' });
  }
});

// PUT update license
router.put('/:id', verify, async (req, res) => {
  try {
    const { name, description, price, duration_months, features, status } = req.body;
    const { rows } = await db.query(`
      UPDATE licenses SET name=$1, description=$2, price=$3, duration_months=$4,
        features=$5, status=$6, updated_at=NOW()
      WHERE id=$7 RETURNING *
    `, [name, description||null, price||0, duration_months||12, features||null, status||'active', req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'License not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /licenses/:id error:', err);
    res.status(500).json({ error: 'Failed to update license' });
  }
});

// DELETE license
router.delete('/:id', verify, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM licenses WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'License not found' });
    res.json({ message: 'License deleted' });
  } catch (err) {
    console.error('DELETE /licenses/:id error:', err);
    res.status(500).json({ error: 'Failed to delete license' });
  }
});

module.exports = router;
