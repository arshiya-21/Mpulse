const router = require('express').Router();
const db     = require('../config/db');
const { verify } = require('../middleware/auth');

const DEFAULT_TYPES = [
  {name:'Laptop',icon:'💻'},{name:'Desktop',icon:'🖥️'},{name:'Monitor',icon:'🖥️'},
  {name:'Mobile Phone',icon:'📱'},{name:'Tablet',icon:'📱'},{name:'Printer',icon:'🖨️'},
  {name:'UPS',icon:'🔋'},{name:'Keyboard',icon:'⌨️'},{name:'Other',icon:'📦'},
];

// ── Asset Types ──────────────────────────────────────────────────────────────
router.get('/types', verify, async (_req, res) => {
  try {
    let { rows } = await db.query('SELECT * FROM asset_types ORDER BY name');
    if (!rows.length) {
      await Promise.all(DEFAULT_TYPES.map(t =>
        db.query('INSERT INTO asset_types (name,icon) VALUES ($1,$2) ON CONFLICT DO NOTHING', [t.name, t.icon])
      ));
      ({ rows } = await db.query('SELECT * FROM asset_types ORDER BY name'));
    }
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/types', verify, async (req, res) => {
  const { name, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const { rows } = await db.query(
    'INSERT INTO asset_types (name,icon) VALUES ($1,$2) ON CONFLICT (name) DO UPDATE SET icon=$2 RETURNING *',
    [name, icon || '📦']
  );
  res.status(201).json(rows[0]);
});
router.delete('/types/:name', verify, async (req, res) => {
  await db.query('DELETE FROM asset_types WHERE name=$1', [req.params.name]);
  res.json({ ok: true });
});

// ── Assets CRUD ───────────────────────────────────────────────────────────────
router.get('/', verify, async (_req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM assets ORDER BY created_at DESC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', verify, async (req, res) => {
  try {
    const { rows: a } = await db.query('SELECT * FROM assets WHERE id=$1', [req.params.id]);
    if (!a[0]) return res.status(404).json({ error: 'Asset not found' });
    const { rows: history }     = await db.query('SELECT * FROM asset_transfers   WHERE asset_id=$1 ORDER BY transfer_date DESC', [req.params.id]);
    const { rows: serviceLogs } = await db.query('SELECT * FROM asset_service_logs WHERE asset_id=$1 ORDER BY service_date  DESC', [req.params.id]);
    res.json({ ...a[0], history, serviceLogs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', verify, async (req, res) => {
  try {
    const { id, name, code, type, brand, model, condition, purchased, warranty, cost, vendor, status, assignee, department, location, notes } = req.body;
    if (!id || !name || !type) return res.status(400).json({ error: 'id, name and type are required' });
    const { rows } = await db.query(`
      INSERT INTO assets (id,name,code,type,brand,model,condition,purchased,warranty,cost,vendor,status,assignee,department,location,notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *
    `, [id, name, code||null, type, brand||null, model||null, condition||'Good',
        purchased||null, warranty||null, Number(cost)||0, vendor||null,
        status||'Available', assignee||null, department||null, location||null, notes||null]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', verify, async (req, res) => {
  try {
    const { name, code, type, brand, model, condition, purchased, warranty, cost, vendor, status, assignee, department, location, notes } = req.body;
    const { rows } = await db.query(`
      UPDATE assets SET name=$1,code=$2,type=$3,brand=$4,model=$5,condition=$6,
        purchased=$7,warranty=$8,cost=$9,vendor=$10,status=$11,assignee=$12,
        department=$13,location=$14,notes=$15,updated_at=NOW()
      WHERE id=$16 RETURNING *
    `, [name, code||null, type, brand||null, model||null, condition||'Good',
        purchased||null, warranty||null, Number(cost)||0, vendor||null,
        status||'Available', assignee||null, department||null, location||null,
        notes||null, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Asset not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', verify, async (req, res) => {
  try {
    await db.query('DELETE FROM assets WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Transfers ────────────────────────────────────────────────────────────────
router.get('/:id/transfers', verify, async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM asset_transfers WHERE asset_id=$1 ORDER BY transfer_date DESC',
    [req.params.id]
  );
  res.json(rows);
});

router.post('/:id/transfer', verify, async (req, res) => {
  try {
    const { to_employee, transfer_date, reason } = req.body;
    if (!to_employee) return res.status(400).json({ error: 'to_employee required' });
    const { rows: cur } = await db.query('SELECT assignee FROM assets WHERE id=$1', [req.params.id]);
    if (!cur[0]) return res.status(404).json({ error: 'Asset not found' });
    await db.query(
      'INSERT INTO asset_transfers (asset_id,from_employee,to_employee,transfer_date,reason,transferred_by) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.params.id, cur[0].assignee, to_employee, transfer_date, reason||null, req.user?.name||'Admin']
    );
    await db.query('UPDATE assets SET assignee=$1,status=$2,updated_at=NOW() WHERE id=$3',
      [to_employee, 'In Use', req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Service Logs ─────────────────────────────────────────────────────────────
router.get('/:id/service-logs', verify, async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM asset_service_logs WHERE asset_id=$1 ORDER BY service_date DESC',
    [req.params.id]
  );
  res.json(rows);
});

router.post('/:id/service-log', verify, async (req, res) => {
  try {
    const { service_date, issue, action_taken, serviced_by, cost } = req.body;
    if (!issue) return res.status(400).json({ error: 'issue required' });
    const { rows } = await db.query(
      'INSERT INTO asset_service_logs (asset_id,service_date,issue,action_taken,serviced_by,cost) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [req.params.id, service_date, issue, action_taken||null, serviced_by||null, Number(cost)||0]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;