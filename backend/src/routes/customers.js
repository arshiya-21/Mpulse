const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { verify } = require('../middleware/auth');

// GET all customers
router.get('/', verify, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT c.*, l.name AS license_name, l.price AS license_price
      FROM customers c
      LEFT JOIN licenses l ON c.license_id = l.id
      ORDER BY c.name
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /customers error:', err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// GET single customer
router.get('/:id', verify, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT c.*, l.name AS license_name
      FROM customers c
      LEFT JOIN licenses l ON c.license_id = l.id
      WHERE c.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Customer not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /customers/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// POST create customer
router.post('/', verify, async (req, res) => {
  try {
    const { name, email, phone, company, license_id, license_start_date, license_end_date, status, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const { rows } = await db.query(`
      INSERT INTO customers (name, email, phone, company, license_id, license_start_date, license_end_date, status, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `, [name, email||null, phone||null, company||null, license_id||null,
        license_start_date||null, license_end_date||null, status||'active', notes||null]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /customers error:', err);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// PUT update customer
router.put('/:id', verify, async (req, res) => {
  try {
    const { name, email, phone, company, license_id, license_start_date, license_end_date, status, notes } = req.body;
    const { rows } = await db.query(`
      UPDATE customers SET name=$1, email=$2, phone=$3, company=$4, license_id=$5,
        license_start_date=$6, license_end_date=$7, status=$8, notes=$9, updated_at=NOW()
      WHERE id=$10 RETURNING *
    `, [name, email||null, phone||null, company||null, license_id||null,
        license_start_date||null, license_end_date||null, status||'active', notes||null, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Customer not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /customers/:id error:', err);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// DELETE customer
router.delete('/:id', verify, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM customers WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Customer not found' });
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    console.error('DELETE /customers/:id error:', err);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

module.exports = router;
