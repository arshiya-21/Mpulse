const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { verify } = require('../middleware/auth');

// GET all renewals (each with its renewal history attached)
router.get('/', verify, async (req, res) => {
  try {
    const { rows: renewals } = await db.query('SELECT * FROM marketing_renewals ORDER BY id DESC');
    const ids = renewals.map(r => r.id);
    const { rows: history } = ids.length
      ? await db.query('SELECT * FROM marketing_renewal_history WHERE renewal_id = ANY($1) ORDER BY renewed_on DESC', [ids])
      : { rows: [] };
    const result = renewals.map(r => ({ ...r, history: history.filter(h => h.renewal_id === r.id) }));
    res.json(result);
  } catch (err) {
    console.error('GET /marketing/renewals error:', err);
    res.status(500).json({ error: 'Failed to fetch renewals' });
  }
});

// POST create renewal
router.post('/', verify, async (req, res) => {
  try {
    const { renewal_no, order_id, customer, product, license, users, contract_start, contract_end, value, assigned_to, notes, renewal_status } = req.body;
    if (!renewal_no) return res.status(400).json({ error: 'Renewal number is required' });
    if (!customer)   return res.status(400).json({ error: 'Customer is required' });
    if (!product)    return res.status(400).json({ error: 'Product is required' });

    const { rows } = await db.query(`
      INSERT INTO marketing_renewals
        (renewal_no, order_id, customer, product, license, users, contract_start, contract_end, value, assigned_to, notes, renewal_status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *
    `, [
      renewal_no, order_id || null, customer, product, license || null, users || null,
      contract_start || null, contract_end || null, value || 0, assigned_to || null, notes || null,
      renewal_status || 'Active',
    ]);

    res.status(201).json({ ...rows[0], history: [] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Renewal number already exists' });
    console.error('POST /marketing/renewals error:', err);
    res.status(500).json({ error: 'Failed to create renewal' });
  }
});

// PUT update renewal base fields
router.put('/:id', verify, async (req, res) => {
  try {
    const { customer, product, license, users, contract_start, contract_end, value, assigned_to, notes, renewal_status } = req.body;
    const { rows } = await db.query(`
      UPDATE marketing_renewals SET
        customer=$1, product=$2, license=$3, users=$4, contract_start=$5, contract_end=$6,
        value=$7, assigned_to=$8, notes=$9, renewal_status=$10, updated_at=NOW()
      WHERE id=$11 RETURNING *
    `, [
      customer, product, license || null, users || null, contract_start || null, contract_end || null,
      value || 0, assigned_to || null, notes || null, renewal_status || 'Active', req.params.id,
    ]);
    if (!rows[0]) return res.status(404).json({ error: 'Renewal not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /marketing/renewals/:id error:', err);
    res.status(500).json({ error: 'Failed to update renewal' });
  }
});

// POST record a renewal cycle: appends history and updates the base contract
router.post('/:id/renew', verify, async (req, res) => {
  try {
    const { new_contract_start, new_contract_end, new_value, renewal_status, notes } = req.body;
    if (!new_contract_start) return res.status(400).json({ error: 'New contract start date is required' });
    if (!new_contract_end)   return res.status(400).json({ error: 'New contract end date is required' });

    const { rows: current } = await db.query('SELECT * FROM marketing_renewals WHERE id=$1', [req.params.id]);
    if (!current[0]) return res.status(404).json({ error: 'Renewal not found' });
    const old = current[0];

    // History logs the contract period that's ending, dated to today's renewal action
    await db.query(`
      INSERT INTO marketing_renewal_history (renewal_id, renewed_on, contract_start, contract_end, value, status, notes)
      VALUES ($1, CURRENT_DATE, $2, $3, $4, 'Renewed', $5)
    `, [req.params.id, old.contract_start, old.contract_end, old.value, notes || null]);

    const { rows } = await db.query(`
      UPDATE marketing_renewals SET
        contract_start=$1, contract_end=$2, value=$3, renewal_status=$4, updated_at=NOW()
      WHERE id=$5 RETURNING *
    `, [new_contract_start, new_contract_end, new_value || 0, renewal_status || 'Active', req.params.id]);

    const { rows: history } = await db.query(
      'SELECT * FROM marketing_renewal_history WHERE renewal_id = $1 ORDER BY renewed_on DESC',
      [req.params.id]
    );
    res.json({ ...rows[0], history });
  } catch (err) {
    console.error('POST /marketing/renewals/:id/renew error:', err);
    res.status(500).json({ error: 'Failed to record renewal' });
  }
});

// DELETE renewal
router.delete('/:id', verify, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM marketing_renewals WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Renewal not found' });
    res.json({ message: 'Renewal deleted' });
  } catch (err) {
    console.error('DELETE /marketing/renewals/:id error:', err);
    res.status(500).json({ error: 'Failed to delete renewal' });
  }
});

module.exports = router;
