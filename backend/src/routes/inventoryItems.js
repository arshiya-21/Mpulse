const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { verify } = require('../middleware/auth');

// GET all items
router.get('/', verify, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT i.*, d.name AS department
      FROM inventory_items i
      LEFT JOIN departments d ON d.id = i.department_id
      ORDER BY i.code
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /inventory/items error:', err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// GET single item
router.get('/:id', verify, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT * FROM inventory_items WHERE id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Item not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /inventory/items/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// POST create item
router.post('/', verify, async (req, res) => {
  try {
    const { code, name, category, unit, stock, min_stock, cost, sell_price, supplier, department_id, date_added, invoice_no, remarks, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Item name is required' });
    if (!code) return res.status(400).json({ error: 'Item code is required' });
    const { rows } = await db.query(`
      INSERT INTO inventory_items (code, name, category, unit, stock, min_stock, cost, sell_price, supplier, department_id, date_added, invoice_no, remarks, description)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11,CURRENT_DATE),$12,$13,$14) RETURNING *
    `, [code, name, category||null, unit||'Units', stock||0, min_stock||0,
        cost||0, sell_price||0, supplier||null, department_id||null, date_added||null, invoice_no||null, remarks||null, description||null]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /inventory/items error:', err);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// PUT update item
router.put('/:id', verify, async (req, res) => {
  try {
    const { name, category, unit, stock, min_stock, cost, sell_price, supplier, department_id, date_added, invoice_no, remarks, description } = req.body;
    const { rows } = await db.query(`
      UPDATE inventory_items SET name=$1, category=$2, unit=$3, stock=$4, min_stock=$5,
        cost=$6, sell_price=$7, supplier=$8, department_id=$9, date_added=COALESCE($10,date_added),
        invoice_no=$11, remarks=$12, description=$13, updated_at=NOW()
      WHERE id=$14 RETURNING *
    `, [name, category||null, unit||'Units', stock||0, min_stock||0,
        cost||0, sell_price||0, supplier||null, department_id||null, date_added||null,
        invoice_no||null, remarks||null, description||null, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Item not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /inventory/items/:id error:', err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// DELETE item
router.delete('/:id', verify, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM inventory_items WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error('DELETE /inventory/items/:id error:', err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

module.exports = router;