const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { verify } = require('../middleware/auth');

// GET phases for a product (?product_id=X)
router.get('/', verify, async (req, res) => {
  try {
    const { product_id } = req.query;
    if (!product_id) return res.status(400).json({ error: 'product_id is required' });
    const { rows } = await db.query(
      'SELECT * FROM marketing_product_phases WHERE product_id = $1 ORDER BY phase_number',
      [product_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /marketing/product-phases error:', err);
    res.status(500).json({ error: 'Failed to fetch product phases' });
  }
});

// POST create phase
router.post('/', verify, async (req, res) => {
  try {
    const { product_id, phase_number, title, weeks, description, steps } = req.body;
    if (!product_id)          return res.status(400).json({ error: 'product_id is required' });
    if (phase_number == null) return res.status(400).json({ error: 'Phase number is required' });
    if (!title)               return res.status(400).json({ error: 'Title is required' });
    const { rows } = await db.query(`
      INSERT INTO marketing_product_phases (product_id, phase_number, title, weeks, description, steps)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [product_id, phase_number, title, weeks || null, description || null, steps || []]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'That phase number already exists for this product' });
    console.error('POST /marketing/product-phases error:', err);
    res.status(500).json({ error: 'Failed to create phase' });
  }
});

// PUT update phase
router.put('/:id', verify, async (req, res) => {
  try {
    const { phase_number, title, weeks, description, steps } = req.body;
    if (phase_number == null) return res.status(400).json({ error: 'Phase number is required' });
    if (!title)               return res.status(400).json({ error: 'Title is required' });
    const { rows } = await db.query(`
      UPDATE marketing_product_phases
      SET phase_number=$1, title=$2, weeks=$3, description=$4, steps=$5, updated_at=NOW()
      WHERE id=$6 RETURNING *
    `, [phase_number, title, weeks || null, description || null, steps || [], req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Phase not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'That phase number already exists for this product' });
    console.error('PUT /marketing/product-phases/:id error:', err);
    res.status(500).json({ error: 'Failed to update phase' });
  }
});

// DELETE phase
router.delete('/:id', verify, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM marketing_product_phases WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Phase not found' });
    res.json({ message: 'Phase deleted' });
  } catch (err) {
    console.error('DELETE /marketing/product-phases/:id error:', err);
    res.status(500).json({ error: 'Failed to delete phase' });
  }
});

module.exports = router;
