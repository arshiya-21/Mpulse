const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { verify } = require('../middleware/auth');

// GET all orders
router.get('/', verify, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM marketing_orders ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error('GET /marketing/orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// POST create order
router.post('/', verify, async (req, res) => {
  try {
    const {
      order_no, customer, product, order_date, value, paid, outstanding, payment_progress,
      po_no, po_document_url, po_document_name, order_status, payment_status, assigned_to,
    } = req.body;

    if (!order_no)   return res.status(400).json({ error: 'Order number is required' });
    if (!customer)   return res.status(400).json({ error: 'Customer is required' });
    if (!product)    return res.status(400).json({ error: 'Product is required' });
    if (!order_date) return res.status(400).json({ error: 'Order date is required' });

    const { rows } = await db.query(`
      INSERT INTO marketing_orders (
        order_no, customer, product, order_date, value, paid, outstanding, payment_progress,
        po_no, po_uploaded, po_document_url, po_document_name, order_status, payment_status, assigned_to
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *
    `, [
      order_no, customer, product, order_date, value || 0, paid || 0, outstanding || 0,
      payment_progress || 'Pending', po_no || null, !!po_document_url, po_document_url || null, po_document_name || null,
      order_status || 'Draft', payment_status || 'Pending', assigned_to || null,
    ]);

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Order number already exists' });
    console.error('POST /marketing/orders error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// PUT update order
router.put('/:id', verify, async (req, res) => {
  try {
    const {
      customer, product, order_date, value, paid, outstanding, payment_progress,
      po_no, po_document_url, po_document_name, order_status, payment_status, assigned_to,
    } = req.body;

    const { rows } = await db.query(`
      UPDATE marketing_orders SET
        customer=$1, product=$2, order_date=$3, value=$4, paid=$5, outstanding=$6, payment_progress=$7,
        po_no=$8, po_uploaded=$9, po_document_url=$10, po_document_name=$11, order_status=$12, payment_status=$13, assigned_to=$14, updated_at=NOW()
      WHERE id=$15 RETURNING *
    `, [
      customer, product, order_date, value || 0, paid || 0, outstanding || 0, payment_progress || 'Pending',
      po_no || null, !!po_document_url, po_document_url || null, po_document_name || null,
      order_status || 'Draft', payment_status || 'Pending', assigned_to || null,
      req.params.id,
    ]);

    if (!rows[0]) return res.status(404).json({ error: 'Order not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /marketing/orders/:id error:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// DELETE order
router.delete('/:id', verify, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM marketing_orders WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order deleted' });
  } catch (err) {
    console.error('DELETE /marketing/orders/:id error:', err);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

module.exports = router;
