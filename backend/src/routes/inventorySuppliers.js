const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { verify } = require('../middleware/auth');

// GET all suppliers
router.get('/', verify, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT * FROM inventory_suppliers ORDER BY name
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /inventory/suppliers error:', err);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// GET single supplier
router.get('/:id', verify, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT * FROM inventory_suppliers WHERE id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Supplier not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /inventory/suppliers/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch supplier' });
  }
});

// POST create supplier
router.post('/', verify, async (req, res) => {
  try {
    const { name, contact_person, phone, email, city, items_supplied, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Supplier name is required' });
    const { rows } = await db.query(`
      INSERT INTO inventory_suppliers (name, contact_person, phone, email, city, items_supplied, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [name, contact_person||null, phone||null, email||null, city||null, items_supplied||null, notes||null]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /inventory/suppliers error:', err);
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});

// PUT update supplier
router.put('/:id', verify, async (req, res) => {
  try {
    const { name, contact_person, phone, email, city, items_supplied, notes } = req.body;
    const { rows } = await db.query(`
      UPDATE inventory_suppliers SET name=$1, contact_person=$2, phone=$3, email=$4,
        city=$5, items_supplied=$6, notes=$7, updated_at=NOW()
      WHERE id=$8 RETURNING *
    `, [name, contact_person||null, phone||null, email||null, city||null, items_supplied||null, notes||null, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Supplier not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /inventory/suppliers/:id error:', err);
    res.status(500).json({ error: 'Failed to update supplier' });
  }
});

// DELETE supplier
router.delete('/:id', verify, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM inventory_suppliers WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Supplier not found' });
    res.json({ message: 'Supplier deleted' });
  } catch (err) {
    console.error('DELETE /inventory/suppliers/:id error:', err);
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
});

module.exports = router;