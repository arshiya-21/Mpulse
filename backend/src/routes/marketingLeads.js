const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { verify } = require('../middleware/auth');

// DATE columns are cast to text — pg otherwise parses them into JS Date objects
// using the server's local timezone, which shifts the date back a day once
// serialized to JSON in any timezone ahead of UTC (e.g. IST).
const SELECT_LEAD = `
  SELECT l.*, l.created_date::text AS created_date, l.last_modified::text AS last_modified,
    s.name AS lead_source_name
  FROM marketing_leads l
  LEFT JOIN marketing_lead_sources s ON s.id = l.lead_source_id
`;

// GET all leads
router.get('/', verify, async (req, res) => {
  try {
    const { rows } = await db.query(`${SELECT_LEAD} ORDER BY l.id`);
    res.json(rows);
  } catch (err) {
    console.error('GET /marketing/leads error:', err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// GET single lead
router.get('/:id', verify, async (req, res) => {
  try {
    const { rows } = await db.query(`${SELECT_LEAD} WHERE l.id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Lead not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /marketing/leads/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// POST create lead
router.post('/', verify, async (req, res) => {
  try {
    const {
      lead_no, foundry_name, lead_source_id, contact_first_name, contact_last_name,
      country, street, email, city, phone, zip, state, designation, status,
      region, business_area, customer_potential, foundry_info, sand_types,
      mixer_make, mixer_type, mixer_batch_size, hourly_sand_output, pain_points,
      owner, created_date,
    } = req.body;

    if (!lead_no)       return res.status(400).json({ error: 'Lead number is required' });
    if (!foundry_name)  return res.status(400).json({ error: 'Foundry name is required' });
    if (!email)         return res.status(400).json({ error: 'Email is required' });

    const { rows } = await db.query(`
      INSERT INTO marketing_leads (
        lead_no, foundry_name, lead_source_id, contact_first_name, contact_last_name,
        country, street, email, city, phone, zip, state, designation, status,
        region, business_area, customer_potential, foundry_info, sand_types,
        mixer_make, mixer_type, mixer_batch_size, hourly_sand_output, pain_points,
        owner, created_date, last_modified
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,CURRENT_DATE
      ) RETURNING *
    `, [
      lead_no, foundry_name, lead_source_id || null, contact_first_name || null, contact_last_name || null,
      country || null, street || null, email, city || null, phone || null, zip || null, state || null,
      designation || null, status || 'Not Started', region || null, business_area || null,
      customer_potential || [], foundry_info || [], sand_types || [],
      mixer_make || null, mixer_type || null, mixer_batch_size || null, hourly_sand_output || null,
      pain_points || null, owner || null, created_date || null,
    ]);

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Lead number already exists' });
    console.error('POST /marketing/leads error:', err);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// PUT update lead
router.put('/:id', verify, async (req, res) => {
  try {
    const {
      foundry_name, lead_source_id, contact_first_name, contact_last_name,
      country, street, email, city, phone, zip, state, designation, status,
      region, business_area, customer_potential, foundry_info, sand_types,
      mixer_make, mixer_type, mixer_batch_size, hourly_sand_output, pain_points,
      owner,
    } = req.body;

    const { rows } = await db.query(`
      UPDATE marketing_leads SET
        foundry_name=$1, lead_source_id=$2, contact_first_name=$3, contact_last_name=$4,
        country=$5, street=$6, email=$7, city=$8, phone=$9, zip=$10, state=$11, designation=$12,
        status=$13, region=$14, business_area=$15, customer_potential=$16, foundry_info=$17,
        sand_types=$18, mixer_make=$19, mixer_type=$20, mixer_batch_size=$21, hourly_sand_output=$22,
        pain_points=$23, owner=$24, last_modified=CURRENT_DATE, updated_at=NOW()
      WHERE id=$25 RETURNING *
    `, [
      foundry_name, lead_source_id || null, contact_first_name || null, contact_last_name || null,
      country || null, street || null, email, city || null, phone || null, zip || null, state || null,
      designation || null, status || 'Not Started', region || null, business_area || null,
      customer_potential || [], foundry_info || [], sand_types || [],
      mixer_make || null, mixer_type || null, mixer_batch_size || null, hourly_sand_output || null,
      pain_points || null, owner || null, req.params.id,
    ]);

    if (!rows[0]) return res.status(404).json({ error: 'Lead not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /marketing/leads/:id error:', err);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// PUT bulk change owner (used by "Change Owner" action on selected leads)
router.put('/bulk/owner', verify, async (req, res) => {
  try {
    const { ids, owner } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'No leads selected' });
    if (!owner) return res.status(400).json({ error: 'Owner is required' });
    const { rows } = await db.query(`
      UPDATE marketing_leads SET owner=$1, last_modified=CURRENT_DATE, updated_at=NOW()
      WHERE id = ANY($2) RETURNING *
    `, [owner, ids]);
    res.json(rows);
  } catch (err) {
    console.error('PUT /marketing/leads/bulk/owner error:', err);
    res.status(500).json({ error: 'Failed to update owner' });
  }
});

// DELETE lead
router.delete('/:id', verify, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM marketing_leads WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Lead not found' });
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    console.error('DELETE /marketing/leads/:id error:', err);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

module.exports = router;