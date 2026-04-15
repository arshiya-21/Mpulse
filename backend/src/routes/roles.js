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