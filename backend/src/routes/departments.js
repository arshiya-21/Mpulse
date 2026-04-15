const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { verify, requireRole } = require('../middleware/auth');

// GET all — includes employee count
router.get('/', verify, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT d.*,
        (SELECT COUNT(*)::int FROM employees e
         WHERE (e.department_id = d.id OR e.secondary_department_id = d.id)
           AND e.status = 'active') AS employee_count
      FROM departments d
      ORDER BY d.name
    `);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST create
router.post('/', verify, requireRole('Admin'), async (req, res) => {
  try {
    const { name, status = 'active' } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const { rows } = await db.query(
      `INSERT INTO departments (name, status) VALUES ($1,$2) RETURNING *`,
      [name.trim(), status]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Department name already exists' });
    res.status(500).json({ error: e.message });
  }
});

// PUT update
router.put('/:id', verify, requireRole('Admin'), async (req, res) => {
  try {
    const { name, status } = req.body;
    const { rows } = await db.query(`
      UPDATE departments
      SET name   = COALESCE($1, name),
          status = COALESCE($2, status)
      WHERE id = $3 RETURNING *
    `, [name, status, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Department not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE
router.delete('/:id', verify, requireRole('Admin'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id FROM employees WHERE department_id = $1 LIMIT 1`, [req.params.id]
    );
    if (rows.length)
      return res.status(400).json({ error: 'Cannot delete — employees assigned to this department' });
    await db.query(`DELETE FROM departments WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Deleted successfully' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;