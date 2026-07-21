const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { verify } = require('../middleware/auth');

// GET all marketing products
router.get('/', verify, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM marketing_products ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error('GET /marketing/products error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST create product
router.post('/', verify, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const { rows } = await db.query(
      'INSERT INTO marketing_products (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /marketing/products error:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT update product
router.put('/:id', verify, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const { rows } = await db.query(
      'UPDATE marketing_products SET name=$1 WHERE id=$2 RETURNING *',
      [name.trim(), req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Product not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /marketing/products/:id error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE product
router.delete('/:id', verify, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM marketing_products WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error('DELETE /marketing/products/:id error:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;