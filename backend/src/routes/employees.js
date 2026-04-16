const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../config/db');
const { verify, requireRole } = require('../middleware/auth');
const { sendNewUserEmail } = require('../utils/mailer');

const JWT_SECRET = process.env.JWT_SECRET || 'mpulse-secret-key';

function generateTempPassword() { return 'Welcome@123'; }

// ── Helper: resolve user's department_id ─────────────────
async function getDeptId(req) {
  if (req.user.department_id) return req.user.department_id;
  const { rows } = await db.query('SELECT department_id FROM employees WHERE id = $1', [req.user.userId]);
  return rows[0]?.department_id || null;
}

// ── Helper: save manager relationships ────────────────────
async function saveManagers(client, employeeId, managerIds) {
  // Delete existing relationships for this employee
  await client.query('DELETE FROM employee_managers WHERE employee_id = $1', [employeeId]);
  if (managerIds && managerIds.length > 0) {
    const vals = managerIds.map((_, i) => `($1, $${i + 2})`).join(',');
    await client.query(
      `INSERT INTO employee_managers (employee_id, manager_id) VALUES ${vals} ON CONFLICT DO NOTHING`,
      [employeeId, ...managerIds]
    );
  }
}

// ── Base SELECT for employee rows (includes managers_list) ─
const EMP_SELECT = `
  SELECT
    e.id, e.name, e.email, e.status, e.invite_status,
    e.department_id, e.role_id, e.manager_id, e.secondary_department_id,
    e.created_at, e.updated_at,
    d.name  AS department,
    d2.name AS secondary_department,
    r.name  AS role,
    m.name  AS manager,
    COALESCE((
      SELECT json_agg(json_build_object('id', mgr.id, 'name', mgr.name) ORDER BY mgr.name)
      FROM employee_managers em
      JOIN employees mgr ON mgr.id = em.manager_id
      WHERE em.employee_id = e.id
    ), '[]') AS managers_list
  FROM employees e
  LEFT JOIN departments d  ON e.department_id           = d.id
  LEFT JOIN departments d2 ON e.secondary_department_id = d2.id
  LEFT JOIN roles r        ON e.role_id                 = r.id
  LEFT JOIN employees m    ON e.manager_id              = m.id
`;

// ── GET: List employees ───────────────────────────────────
router.get('/', verify, async (req, res) => {
  try {
    // Special param: all_managers=true → return all Admin/Manager roles (for dropdowns)
    if (req.query.all_managers === 'true') {
      const { rows } = await db.query(`
        SELECT e.id, e.name, e.department_id, d.name AS department, r.name AS role
        FROM employees e
        LEFT JOIN roles r ON r.id = e.role_id
        LEFT JOIN departments d ON d.id = e.department_id
        WHERE e.status = 'active' AND r.name IN ('Admin','Manager')
        ORDER BY e.name
      `);
      return res.json(rows);
    }

    let q = EMP_SELECT + ' WHERE 1=1';
    const params = [];

    if (req.user.role === 'Manager') {
      // Manager sees:
      //   1. Employees in their own department
      //   2. Employees who directly report to them (cross-department)
      const deptId = await getDeptId(req);
      params.push(req.user.userId);
      if (deptId) {
        params.push(deptId);
        q += ` AND (
          e.department_id = $${params.length}
          OR e.id IN (
            SELECT em.employee_id FROM employee_managers em WHERE em.manager_id = $1
          )
        )`;
      } else {
        q += ` AND e.id IN (
          SELECT em.employee_id FROM employee_managers em WHERE em.manager_id = $1
        )`;
      }
    } else if (req.user.role === 'User') {
      params.push(req.user.userId);
      q += ` AND e.id = $${params.length}`;
    }
    // Admin: no filter

    q += ' ORDER BY e.name';
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) {
    console.error('❌ GET /employees error:', err);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// ── GET: Single employee by ID ────────────────────────────
router.get('/:id', verify, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role === 'Manager') {
      const deptId = await getDeptId(req);
      const { rows: check } = await db.query(
        `SELECT e.department_id, EXISTS(
          SELECT 1 FROM employee_managers em WHERE em.employee_id = e.id AND em.manager_id = $2
        ) AS reports_to_me
        FROM employees e WHERE e.id = $1`,
        [id, req.user.userId]
      );
      if (!check[0]) return res.status(404).json({ error: 'Employee not found' });
      const inDept = deptId && String(check[0].department_id) === String(deptId);
      if (!inDept && !check[0].reports_to_me) {
        return res.status(403).json({ error: 'Access denied — employee not in your team' });
      }
    } else if (req.user.role === 'User' && String(req.user.userId) !== String(id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { rows } = await db.query(EMP_SELECT + ' WHERE e.id = $1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Employee not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ GET /employees/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

// ── POST: Create new employee (Admin / Manager) ───────────
router.post('/', verify, requireRole('Admin', 'Manager'), async (req, res) => {
  try {
    let { name, email, department_id, role_id, manager_ids, secondary_department_id } = req.body;

    // Manager can only create employees in their own department
    if (req.user.role === 'Manager') {
      department_id = await getDeptId(req);
    }

    if (!name || name.trim().length === 0) return res.status(400).json({ error: 'Name is required' });
    if (!email || email.trim().length === 0) return res.status(400).json({ error: 'Email is required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email format' });

    const { rows: existing } = await db.query('SELECT id FROM employees WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.length > 0) return res.status(400).json({ error: 'Email already exists' });

    const ids = Array.isArray(manager_ids) ? manager_ids.filter(Boolean).map(Number) : [];
    const primaryManagerId = ids.length > 0 ? ids[0] : null;

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const client = await db.pool.connect();
    let newEmployee;
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(`
        INSERT INTO employees
          (name, email, password_hash, department_id, role_id, manager_id,
           secondary_department_id, status, invite_status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,'active','pending') RETURNING *
      `, [name.trim(), email.toLowerCase().trim(), passwordHash,
          department_id || null, role_id || null, primaryManagerId,
          secondary_department_id || null]);
      newEmployee = rows[0];
      await saveManagers(client, newEmployee.id, ids);
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }

    console.log('✅ Employee created:', newEmployee.email);

    let emailError = null;
    try {
      const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      await sendNewUserEmail({ toName: newEmployee.name, toEmail: newEmployee.email, tempPassword, loginUrl, isResend: false });
    } catch (emailErr) {
      console.error('⚠️ Failed to send credentials email:', emailErr.message);
      emailError = emailErr.message;
    }

    res.status(201).json({ message: 'Employee created successfully', data: newEmployee, tempPassword, emailError });
  } catch (err) {
    console.error('❌ POST /employees error:', err);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// ── PUT: Update employee (Admin / Manager) ────────────────
router.put('/:id', verify, requireRole('Admin', 'Manager'), async (req, res) => {
  try {
    const { id } = req.params;
    let { name, email, department_id, role_id, manager_ids, secondary_department_id, status } = req.body;

    if (req.user.role === 'Manager') {
      const managerDeptId = await getDeptId(req);
      const { rows: empCheck } = await db.query(
        `SELECT e.department_id, EXISTS(
          SELECT 1 FROM employee_managers em WHERE em.employee_id = e.id AND em.manager_id = $2
        ) AS reports_to_me
        FROM employees e WHERE e.id = $1`,
        [id, req.user.userId]
      );
      if (!empCheck[0]) return res.status(404).json({ error: 'Employee not found' });
      const inDept = managerDeptId && String(empCheck[0].department_id) === String(managerDeptId);
      if (!inDept && !empCheck[0].reports_to_me) {
        return res.status(403).json({ error: 'You can only manage employees in your team' });
      }
      department_id = empCheck[0].department_id; // can't change dept
    }

    if (!name || name.trim().length === 0) return res.status(400).json({ error: 'Name is required' });
    if (!email || email.trim().length === 0) return res.status(400).json({ error: 'Email is required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email format' });

    const { rows: existing } = await db.query('SELECT id FROM employees WHERE email = $1 AND id != $2', [email.toLowerCase().trim(), id]);
    if (existing.length > 0) return res.status(400).json({ error: 'Email already exists' });

    const ids = Array.isArray(manager_ids) ? manager_ids.filter(Boolean).map(Number) : [];
    const primaryManagerId = ids.length > 0 ? ids[0] : null;

    const client = await db.pool.connect();
    let updated;
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(`
        UPDATE employees SET
          name = $1, email = $2, department_id = $3, role_id = $4,
          manager_id = $5, secondary_department_id = $6, status = $7, updated_at = NOW()
        WHERE id = $8 RETURNING *
      `, [name.trim(), email.toLowerCase().trim(),
          department_id || null, role_id || null, primaryManagerId,
          secondary_department_id || null, status || 'active', id]);
      if (!rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Employee not found' }); }
      updated = rows[0];
      await saveManagers(client, id, ids);
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }

    console.log('✅ Employee updated:', updated.email);
    res.json({ message: 'Employee updated successfully', data: updated });
  } catch (err) {
    console.error('❌ PUT /employees/:id error:', err);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// ── Helper: check manager can access employee ─────────────
async function managerCanAccess(req, empId) {
  const deptId = await getDeptId(req);
  const { rows } = await db.query(
    `SELECT e.department_id, EXISTS(
      SELECT 1 FROM employee_managers em WHERE em.employee_id = e.id AND em.manager_id = $2
    ) AS reports_to_me
    FROM employees e WHERE e.id = $1`,
    [empId, req.user.userId]
  );
  if (!rows[0]) return false;
  const inDept = deptId && String(rows[0].department_id) === String(deptId);
  return inDept || rows[0].reports_to_me;
}

// ── POST: Generate invite link (Admin / Manager) ──────────
router.post('/:id/invite', verify, requireRole('Admin', 'Manager'), async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role === 'Manager' && !(await managerCanAccess(req, id))) {
      return res.status(403).json({ error: 'Access denied — employee not in your team' });
    }
    const { rows } = await db.query('SELECT id, name, email FROM employees WHERE id = $1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Employee not found' });
    const emp = rows[0];
    const token = jwt.sign({ userId: emp.id, email: emp.email, action: 'set_password' }, JWT_SECRET, { expiresIn: '48h' });
    await db.query(`UPDATE employees SET invite_token=$1, invite_expires=NOW()+INTERVAL '48 hours', updated_at=NOW() WHERE id=$2`, [token, id]);
    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/set-password?token=${token}`;
    res.json({ inviteUrl });
  } catch (err) {
    console.error('❌ POST /employees/:id/invite error:', err);
    res.status(500).json({ error: 'Failed to generate invite' });
  }
});

// ── POST: Resend credentials (Admin / Manager) ────────────
router.post('/:id/resend-credentials', verify, requireRole('Admin', 'Manager'), async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role === 'Manager' && !(await managerCanAccess(req, id))) {
      return res.status(403).json({ error: 'Access denied — employee not in your team' });
    }
    const { rows } = await db.query('SELECT id, name, email FROM employees WHERE id = $1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Employee not found' });
    const employee = rows[0];
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await db.query('UPDATE employees SET password_hash=$1, invite_status=$2, updated_at=NOW() WHERE id=$3', [passwordHash, 'pending', id]);
    const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    await sendNewUserEmail({ toName: employee.name, toEmail: employee.email, tempPassword, loginUrl, isResend: true });
    console.log('✅ Credentials resent to:', employee.email);
    res.json({ message: 'Credentials resent successfully', tempPassword });
  } catch (err) {
    console.error('❌ POST /employees/:id/resend-credentials error:', err);
    res.status(500).json({ error: 'Failed to resend credentials' });
  }
});

// ── DELETE: Delete employee (Admin only) ─────────────────
router.delete('/:id', verify, requireRole('Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query('SELECT id FROM employees WHERE id = $1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Employee not found' });
    await db.query('DELETE FROM employees WHERE id = $1', [id]);
    console.log('✅ Employee deleted:', id);
    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    console.error('❌ DELETE /employees/:id error:', err);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

module.exports = router;
