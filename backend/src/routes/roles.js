const router = require('express').Router();
const db     = require('../config/db');
const { verify, requireRole } = require('../middleware/auth');

// GET all with member count
router.get('/', verify, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT r.*, COUNT(e.id)::int AS member_count
      FROM roles r
      LEFT JOIN employees e ON e.role_id = r.id
      GROUP BY r.id ORDER BY r.name
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST create
router.post('/', verify, requireRole('Admin'), async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Role name required' });
    const { rows } = await db.query(
      `INSERT INTO roles (name, description) VALUES ($1,$2) RETURNING *`,
      [name.trim(), description]
    );
    // Auto-seed all-false permissions for the new role so it appears in Access Config
    const PAGE_KEYS = [
      'dashboard','worklog','visits','projects','masterdata','reports','admin','library',
      'md_employees','md_departments','md_roles','md_licenses','md_customers',
      'md_emailconfig','md_accessconfig','md_categories','_team_only'
    ];
    const roleName = rows[0].name;
    await Promise.all(PAGE_KEYS.map(key =>
      db.query(`
        INSERT INTO role_permissions (role_name, page_key, can_view, can_create, can_update, can_delete)
        VALUES ($1,$2,false,false,false,false)
        ON CONFLICT (role_name, page_key) DO NOTHING
      `, [roleName, key])
    ));
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Role already exists' });
    res.status(500).json({ error: e.message });
  }
});

// DELETE
router.delete('/:id', verify, requireRole('Admin'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id FROM employees WHERE role_id = $1 LIMIT 1`, [req.params.id]
    );
    if (rows.length)
      return res.status(400).json({ error: 'Cannot delete — employees have this role' });
    await db.query(`DELETE FROM roles WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Deleted successfully' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;