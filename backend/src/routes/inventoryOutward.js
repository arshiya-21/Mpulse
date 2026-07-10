const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { verify } = require('../middleware/auth');

// GET all outward entries (with their line items attached)
router.get('/', verify, async (req, res) => {
  try {
    const { rows: headers } = await db.query(`
      SELECT * FROM inventory_outward ORDER BY date DESC, id DESC
    `);
    const ids = headers.map(h => h.id);
    const { rows: items } = ids.length
      ? await db.query(`SELECT * FROM inventory_outward_items WHERE outward_id = ANY($1)`, [ids])
      : { rows: [] };
    const result = headers.map(h => ({
      ...h,
      items: items.filter(it => it.outward_id === h.id)
    }));
    res.json(result);
  } catch (err) {
    console.error('GET /inventory/outward error:', err);
    res.status(500).json({ error: 'Failed to fetch outward entries' });
  }
});

// GET single outward entry with its items
router.get('/:id', verify, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT * FROM inventory_outward WHERE id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Outward entry not found' });
    const { rows: items } = await db.query(`
      SELECT * FROM inventory_outward_items WHERE outward_id = $1
    `, [req.params.id]);
    res.json({ ...rows[0], items });
  } catch (err) {
    console.error('GET /inventory/outward/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch outward entry' });
  }
});

// POST create outward entry (header + line items together)
router.post('/', verify, async (req, res) => {
  try {
    const { dn_number, date, customer_name, order_ref, dispatched_by, status, notes, total_value, items } = req.body;
    if (!dn_number)     return res.status(400).json({ error: 'Delivery note number is required' });
    if (!date)          return res.status(400).json({ error: 'Date is required' });
    if (!customer_name) return res.status(400).json({ error: 'Customer name is required' });
    if (!items || !items.length) return res.status(400).json({ error: 'At least one item is required' });

    const { rows } = await db.query(`
      INSERT INTO inventory_outward (dn_number, date, customer_name, order_ref, dispatched_by, status, notes, total_value)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [dn_number, date, customer_name, order_ref||null, dispatched_by||null, status||'Pending', notes||null, total_value||0]);

    const outward = rows[0];

    for (const it of items) {
      await db.query(`
        INSERT INTO inventory_outward_items (outward_id, item_id, item_name, unit_price, qty)
        VALUES ($1,$2,$3,$4,$5)
      `, [outward.id, it.item_id||null, it.item_name, it.unit_price||0, it.qty||1]);
    }

    const { rows: savedItems } = await db.query(`
      SELECT * FROM inventory_outward_items WHERE outward_id = $1
    `, [outward.id]);

    res.status(201).json({ ...outward, items: savedItems });
  } catch (err) {
    console.error('POST /inventory/outward error:', err);
    res.status(500).json({ error: 'Failed to create outward entry' });
  }
});

// PUT update outward entry (header + replace all line items)
router.put('/:id', verify, async (req, res) => {
  try {
    const { date, customer_name, order_ref, dispatched_by, status, notes, total_value, items } = req.body;

    const { rows } = await db.query(`
      UPDATE inventory_outward SET date=$1, customer_name=$2, order_ref=$3, dispatched_by=$4,
        status=$5, notes=$6, total_value=$7, updated_at=NOW()
      WHERE id=$8 RETURNING *
    `, [date, customer_name, order_ref||null, dispatched_by||null, status||'Pending', notes||null, total_value||0, req.params.id]);

    if (!rows[0]) return res.status(404).json({ error: 'Outward entry not found' });

    await db.query('DELETE FROM inventory_outward_items WHERE outward_id = $1', [req.params.id]);
    for (const it of (items || [])) {
      await db.query(`
        INSERT INTO inventory_outward_items (outward_id, item_id, item_name, unit_price, qty)
        VALUES ($1,$2,$3,$4,$5)
      `, [req.params.id, it.item_id||null, it.item_name, it.unit_price||0, it.qty||1]);
    }

    const { rows: savedItems } = await db.query(`
      SELECT * FROM inventory_outward_items WHERE outward_id = $1
    `, [req.params.id]);

    res.json({ ...rows[0], items: savedItems });
  } catch (err) {
    console.error('PUT /inventory/outward/:id error:', err);
    res.status(500).json({ error: 'Failed to update outward entry' });
  }
});

// DELETE outward entry (line items cascade automatically)
router.delete('/:id', verify, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM inventory_outward WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Outward entry not found' });
    res.json({ message: 'Outward entry deleted' });
  } catch (err) {
    console.error('DELETE /inventory/outward/:id error:', err);
    res.status(500).json({ error: 'Failed to delete outward entry' });
  }
});

module.exports = router;