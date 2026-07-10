const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { verify } = require('../middleware/auth');

// GET all inward entries (with their line items attached)
router.get('/', verify, async (req, res) => {
  try {
    const { rows: headers } = await db.query(`
      SELECT i.*, s.name AS supplier_name
      FROM inventory_inward i
      LEFT JOIN inventory_suppliers s ON i.supplier_id = s.id
      ORDER BY i.date DESC, i.id DESC
    `);
    const ids = headers.map(h => h.id);
    const { rows: items } = ids.length
      ? await db.query(`SELECT * FROM inventory_inward_items WHERE inward_id = ANY($1)`, [ids])
      : { rows: [] };
    const result = headers.map(h => ({
      ...h,
      items: items.filter(it => it.inward_id === h.id)
    }));
    res.json(result);
  } catch (err) {
    console.error('GET /inventory/inward error:', err);
    res.status(500).json({ error: 'Failed to fetch inward entries' });
  }
});

// GET single inward entry with its items
router.get('/:id', verify, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT i.*, s.name AS supplier_name
      FROM inventory_inward i
      LEFT JOIN inventory_suppliers s ON i.supplier_id = s.id
      WHERE i.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Inward entry not found' });
    const { rows: items } = await db.query(`
      SELECT * FROM inventory_inward_items WHERE inward_id = $1
    `, [req.params.id]);
    res.json({ ...rows[0], items });
  } catch (err) {
    console.error('GET /inventory/inward/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch inward entry' });
  }
});

// POST create inward entry (header + line items together)
router.post('/', verify, async (req, res) => {
  try {
    const { grn_number, date, supplier_id, invoice_no, received_by, status, notes, total_value, items } = req.body;
    if (!grn_number) return res.status(400).json({ error: 'GRN number is required' });
    if (!date)        return res.status(400).json({ error: 'Date is required' });
    if (!supplier_id) return res.status(400).json({ error: 'Supplier is required' });
    if (!items || !items.length) return res.status(400).json({ error: 'At least one item is required' });

    const { rows } = await db.query(`
      INSERT INTO inventory_inward (grn_number, date, supplier_id, invoice_no, received_by, status, notes, total_value)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [grn_number, date, supplier_id, invoice_no||null, received_by||null, status||'Pending', notes||null, total_value||0]);

    const inward = rows[0];

    for (const it of items) {
      await db.query(`
        INSERT INTO inventory_inward_items (inward_id, item_id, item_name, unit_cost, qty)
        VALUES ($1,$2,$3,$4,$5)
      `, [inward.id, it.item_id||null, it.item_name, it.unit_cost||0, it.qty||1]);
    }

    const { rows: savedItems } = await db.query(`
      SELECT * FROM inventory_inward_items WHERE inward_id = $1
    `, [inward.id]);

    res.status(201).json({ ...inward, items: savedItems });
  } catch (err) {
    console.error('POST /inventory/inward error:', err);
    res.status(500).json({ error: 'Failed to create inward entry' });
  }
});

// PUT update inward entry (header + replace all line items)
router.put('/:id', verify, async (req, res) => {
  try {
    const { date, supplier_id, invoice_no, received_by, status, notes, total_value, items } = req.body;

    const { rows } = await db.query(`
      UPDATE inventory_inward SET date=$1, supplier_id=$2, invoice_no=$3, received_by=$4,
        status=$5, notes=$6, total_value=$7, updated_at=NOW()
      WHERE id=$8 RETURNING *
    `, [date, supplier_id, invoice_no||null, received_by||null, status||'Pending', notes||null, total_value||0, req.params.id]);

    if (!rows[0]) return res.status(404).json({ error: 'Inward entry not found' });

    // Replace line items: delete old ones, insert new ones
    await db.query('DELETE FROM inventory_inward_items WHERE inward_id = $1', [req.params.id]);
    for (const it of (items || [])) {
      await db.query(`
        INSERT INTO inventory_inward_items (inward_id, item_id, item_name, unit_cost, qty)
        VALUES ($1,$2,$3,$4,$5)
      `, [req.params.id, it.item_id||null, it.item_name, it.unit_cost||0, it.qty||1]);
    }

    const { rows: savedItems } = await db.query(`
      SELECT * FROM inventory_inward_items WHERE inward_id = $1
    `, [req.params.id]);

    res.json({ ...rows[0], items: savedItems });
  } catch (err) {
    console.error('PUT /inventory/inward/:id error:', err);
    res.status(500).json({ error: 'Failed to update inward entry' });
  }
});

// DELETE inward entry (line items cascade automatically)
router.delete('/:id', verify, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM inventory_inward WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Inward entry not found' });
    res.json({ message: 'Inward entry deleted' });
  } catch (err) {
    console.error('DELETE /inventory/inward/:id error:', err);
    res.status(500).json({ error: 'Failed to delete inward entry' });
  }
});

module.exports = router;