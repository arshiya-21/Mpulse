const express    = require('express');
const router     = express.Router();
const db         = require('../config/db');
const { verify } = require('../middleware/auth');

// Transform DB rows → { roleName: { pageKey: { view, create, update, delete } } }
function rowsToConfig(rows) {
  const cfg = {};
  for (const r of rows) {
    if (!cfg[r.role_name]) cfg[r.role_name] = {};
    cfg[r.role_name][r.page_key] = {
      view:   r.can_view,
      create: r.can_create,
      update: r.can_update,
      delete: r.can_delete,
    };
  }
  return cfg;
}

// GET all permissions → { roleName: { pageKey: { view,create,update,delete } } }
router.get('/', verify, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT role_name, page_key, can_view, can_create, can_update, can_delete FROM role_permissions ORDER BY role_name, page_key'
    );
    res.json(rowsToConfig(rows));
  } catch (err) {
    console.error('GET /permissions error:', err);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// PUT bulk update — body: { roleName: { pageKey: { view, create, update, delete } } }
router.put('/', verify, async (req, res) => {
  const client = await db.pool.connect();
  try {
    const cfg = req.body;
    if (!cfg || typeof cfg !== 'object') return res.status(400).json({ error: 'Config object required' });

    await client.query('BEGIN');
    for (const [roleName, pages] of Object.entries(cfg)) {
      for (const [pageKey, perms] of Object.entries(pages)) {
        await client.query(`
          INSERT INTO role_permissions (role_name, page_key, can_view, can_create, can_update, can_delete)
          VALUES ($1,$2,$3,$4,$5,$6)
          ON CONFLICT (role_name, page_key) DO UPDATE
            SET can_view=$3, can_create=$4, can_update=$5, can_delete=$6
        `, [roleName, pageKey, !!perms.view, !!perms.create, !!perms.update, !!perms.delete]);
      }
    }
    await client.query('COMMIT');
    res.json({ message: 'Permissions saved' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('PUT /permissions error:', err);
    res.status(500).json({ error: 'Failed to save permissions' });
  } finally {
    client.release();
  }
});

module.exports = router;
