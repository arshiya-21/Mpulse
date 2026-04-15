const express    = require('express');
const router     = express.Router();
const db         = require('../config/db');
const { verify } = require('../middleware/auth');

// GET all role permissions
router.get('/', verify, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT rp.*, r.name AS role_name
      FROM role_permissions rp
      JOIN roles r ON rp.role_id = r.id
      ORDER BY r.name, rp.module
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /permissions error:', err);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// GET permissions for a specific role
router.get('/role/:roleId', verify, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM role_permissions WHERE role_id = $1 ORDER BY module',
      [req.params.roleId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /permissions/role/:roleId error:', err);
    res.status(500).json({ error: 'Failed to fetch role permissions' });
  }
});

// PUT bulk update permissions for a role (replace all)
router.put('/role/:roleId', verify, async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { permissions } = req.body; // array of { module, can_view, can_create, can_edit, can_delete }
    if (!Array.isArray(permissions)) return res.status(400).json({ error: 'permissions array required' });

    await client.query('BEGIN');
    await client.query('DELETE FROM role_permissions WHERE role_id = $1', [req.params.roleId]);

    for (const p of permissions) {
      await client.query(`
        INSERT INTO role_permissions (role_id, module, can_view, can_create, can_edit, can_delete)
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [req.params.roleId, p.module, !!p.can_view, !!p.can_create, !!p.can_edit, !!p.can_delete]);
    }
    await client.query('COMMIT');

    const { rows } = await client.query(
      'SELECT * FROM role_permissions WHERE role_id = $1 ORDER BY module',
      [req.params.roleId]
    );
    res.json(rows);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('PUT /permissions/role/:roleId error:', err);
    res.status(500).json({ error: 'Failed to update permissions' });
  } finally {
    client.release();
  }
});

// PUT bulk update ALL permissions (full config object from AccessConfig)
// Body: { roleName: { module: { view, create, edit, delete } } }
router.put('/', verify, async (req, res) => {
  const client = await db.pool.connect();
  try {
    const cfg = req.body; // { roleName: { module: { view, create, edit, delete } } }
    if (!cfg || typeof cfg !== 'object') return res.status(400).json({ error: 'Config object required' });

    await client.query('BEGIN');

    // Get all roles
    const { rows: roles } = await client.query('SELECT id, name FROM roles');
    const roleMap = Object.fromEntries(roles.map(r => [r.name, r.id]));

    for (const [roleName, modules] of Object.entries(cfg)) {
      const roleId = roleMap[roleName];
      if (!roleId) continue;
      await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
      for (const [module, perms] of Object.entries(modules)) {
        await client.query(`
          INSERT INTO role_permissions (role_id, module, can_view, can_create, can_edit, can_delete)
          VALUES ($1,$2,$3,$4,$5,$6)
        `, [roleId, module, !!perms.view, !!perms.create, !!perms.edit, !!perms.delete]);
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Permissions updated' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('PUT /permissions error:', err);
    res.status(500).json({ error: 'Failed to update permissions' });
  } finally {
    client.release();
  }
});

module.exports = router;
