const router = require('express').Router();
const db     = require('../config/db');
const { verify } = require('../middleware/auth');
const { sendVisitScheduledEmail } = require('../utils/mailer');

// Helper: get user's department_id (fallback if not in JWT)
async function getDeptId(req) {
  if (req.user.department_id) return req.user.department_id;
  const { rows } = await db.query('SELECT department_id FROM employees WHERE id = $1', [req.user.userId]);
  return rows[0]?.department_id || null;
}

// GET all visits with joins
router.get('/', verify, async (req, res) => {
  try {
    const { status, emp_id } = req.query;
    let q = `
      SELECT v.*,
             c.name  AS customer_name,
             e.name  AS assigned_to_name,
             cr.name AS created_by_name
      FROM customer_visits v
      JOIN customers  c  ON c.id  = v.customer_id
      LEFT JOIN employees e  ON e.id  = v.assigned_to
      LEFT JOIN employees cr ON cr.id = v.created_by
      WHERE 1=1
    `;
    const p = [];
    if (status) { p.push(status); q += ` AND v.status      = $${p.length}`; }
    if (emp_id) { p.push(emp_id); q += ` AND v.assigned_to = $${p.length}`; }

    // Manager sees visits assigned to:
    //   1. Employees in their own department
    //   2. Direct reports from other departments (via employee_managers)
    //   3. Visits they created themselves
    if (req.user.role === 'Manager') {
      const managerDeptId = await getDeptId(req);
      p.push(req.user.userId);
      const mgrParam = p.length;
      if (managerDeptId) {
        p.push(managerDeptId);
        q += ` AND (
          e.department_id = $${p.length}
          OR e.id IN (SELECT em.employee_id FROM employee_managers em WHERE em.manager_id = $${mgrParam})
          OR v.created_by = $${mgrParam}
        )`;
      } else {
        q += ` AND (
          e.id IN (SELECT em.employee_id FROM employee_managers em WHERE em.manager_id = $${mgrParam})
          OR v.created_by = $${mgrParam}
        )`;
      }
    } else if (req.user.role === 'User') {
      // User sees only visits they are assigned to or created
      p.push(req.user.userId);
      q += ` AND (v.assigned_to = $${p.length} OR v.created_by = $${p.length})`;
    }

    q += ' ORDER BY v.planned_date DESC';
    const { rows } = await db.query(q, p);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET single
router.get('/:id', verify, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT v.*, c.name AS customer_name, e.name AS assigned_to_name,
             e.department_id AS assigned_to_dept_id
      FROM customer_visits v
      JOIN customers c ON c.id = v.customer_id
      LEFT JOIN employees e ON e.id = v.assigned_to
      WHERE v.id = $1
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Visit not found' });
    const visit = rows[0];

    // Manager: only their dept's visits
    if (req.user.role === 'Manager') {
      const managerDeptId = await getDeptId(req);
      if (managerDeptId && visit.assigned_to_dept_id &&
          String(visit.assigned_to_dept_id) !== String(managerDeptId) &&
          String(visit.created_by) !== String(req.user.userId)) {
        return res.status(403).json({ error: 'Access denied — visit not in your department' });
      }
    } else if (req.user.role === 'User') {
      if (String(visit.assigned_to) !== String(req.user.userId) &&
          String(visit.created_by) !== String(req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json(visit);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST create
router.post('/', verify, async (req, res) => {
  try {
    const {
      customer_id, contact_person, channel = 'Email', agenda,
      planned_date, duration, assigned_to, proof_file, status = 'Planned',
      work_done, issues_resolved, additional_reqs
    } = req.body;
    if (!customer_id || !agenda || !planned_date)
      return res.status(400).json({ error: 'customer_id, agenda and planned_date are required' });

    // Manager can only assign visits to their dept's employees
    if (req.user.role === 'Manager' && assigned_to) {
      const managerDeptId = await getDeptId(req);
      const { rows: empCheck } = await db.query('SELECT department_id FROM employees WHERE id = $1', [assigned_to]);
      if (empCheck[0] && managerDeptId && String(empCheck[0].department_id) !== String(managerDeptId)) {
        return res.status(403).json({ error: 'You can only assign visits to employees in your department' });
      }
    }

    // User can only create visits assigned to themselves
    const effectiveAssignedTo = req.user.role === 'User' ? req.user.userId : (assigned_to || null);

    const { rows } = await db.query(`
      INSERT INTO customer_visits
        (customer_id, contact_person, channel, agenda, planned_date, duration,
         assigned_to, proof_file, status, work_done, issues_resolved, additional_reqs, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *
    `, [customer_id, contact_person, channel, agenda, planned_date, duration,
        effectiveAssignedTo, proof_file, status, work_done, issues_resolved, additional_reqs, req.user.userId]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT update
router.put('/:id', verify, async (req, res) => {
  try {
    const visitId = req.params.id;

    // Check ownership for User
    if (req.user.role === 'User') {
      const { rows: check } = await db.query('SELECT assigned_to, created_by FROM customer_visits WHERE id = $1', [visitId]);
      if (!check[0] || (String(check[0].assigned_to) !== String(req.user.userId) && String(check[0].created_by) !== String(req.user.userId))) {
        return res.status(403).json({ error: 'You can only update your own visits' });
      }
    }

    // Manager: only their dept
    if (req.user.role === 'Manager') {
      const managerDeptId = await getDeptId(req);
      const { rows: check } = await db.query(`
        SELECT e.department_id FROM customer_visits v
        LEFT JOIN employees e ON e.id = v.assigned_to WHERE v.id = $1
      `, [visitId]);
      if (check[0]?.department_id && managerDeptId && String(check[0].department_id) !== String(managerDeptId)) {
        return res.status(403).json({ error: 'Access denied — visit not in your department' });
      }
    }

    const {
      customer_id, contact_person, channel, agenda, planned_date,
      duration, assigned_to, proof_file, status, work_done, issues_resolved, additional_reqs
    } = req.body;
    const { rows } = await db.query(`
      UPDATE customer_visits SET
        customer_id     = COALESCE($1,  customer_id),
        contact_person  = COALESCE($2,  contact_person),
        channel         = COALESCE($3,  channel),
        agenda          = COALESCE($4,  agenda),
        planned_date    = COALESCE($5,  planned_date),
        duration        = COALESCE($6,  duration),
        assigned_to     = COALESCE($7,  assigned_to),
        proof_file      = COALESCE($8,  proof_file),
        status          = COALESCE($9,  status),
        work_done       = COALESCE($10, work_done),
        issues_resolved = COALESCE($11, issues_resolved),
        additional_reqs = COALESCE($12, additional_reqs)
      WHERE id = $13 RETURNING *
    `, [customer_id, contact_person, channel, agenda, planned_date, duration,
        assigned_to, proof_file, status, work_done, issues_resolved, additional_reqs, visitId]);
    if (!rows.length) return res.status(404).json({ error: 'Visit not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /visits/:id/close
router.put('/:id/close', verify, async (req, res) => {
  try {
    const visitId = req.params.id;

    // User: only close own visits
    if (req.user.role === 'User') {
      const { rows: check } = await db.query('SELECT assigned_to FROM customer_visits WHERE id = $1', [visitId]);
      if (!check[0] || String(check[0].assigned_to) !== String(req.user.userId)) {
        return res.status(403).json({ error: 'You can only close visits assigned to you' });
      }
    }

    const { status = 'Completed', work_done, issues_resolved, additional_reqs } = req.body;
    if (!work_done) return res.status(400).json({ error: 'work_done summary is required' });
    const { rows } = await db.query(`
      UPDATE customer_visits
      SET status          = $1,
          work_done       = $2,
          issues_resolved = $3,
          additional_reqs = $4
      WHERE id = $5 RETURNING *
    `, [status, work_done, issues_resolved, additional_reqs, visitId]);
    if (!rows.length) return res.status(404).json({ error: 'Visit not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /:id/notify — send scheduled-visit email to admin + optional CC
router.post('/:id/notify', verify, async (req, res) => {
  try {
    const { cc = [] } = req.body;

    const { rows } = await db.query(`
      SELECT v.*, c.name AS customer_name, e.name AS assigned_to_name
      FROM customer_visits v
      JOIN customers  c ON c.id = v.customer_id
      LEFT JOIN employees e ON e.id = v.assigned_to
      WHERE v.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Visit not found' });
    const visit = rows[0];

    const { rows: cfg } = await db.query('SELECT admin_email FROM system_settings WHERE id = 1');
    const adminEmail = cfg[0]?.admin_email;
    if (!adminEmail) return res.status(400).json({ error: 'Admin email not configured. Set it in Administration → Company Settings.' });

    const subject = await sendVisitScheduledEmail({
      toEmail:      adminEmail,
      ccEmails:     Array.isArray(cc) ? cc.filter(Boolean) : [],
      customerName: visit.customer_name,
      contactPerson:visit.contact_person,
      agenda:       visit.agenda,
      plannedDate:  visit.planned_date,
      duration:     visit.duration,
      assignedTo:   visit.assigned_to_name,
      channel:      visit.channel,
    });

    res.json({ message: 'Notification sent', to: adminEmail, subject });
  } catch (err) {
    console.error('❌ POST /visits/:id/notify:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE
router.delete('/:id', verify, async (req, res) => {
  try {
    const visitId = req.params.id;

    // User cannot delete visits
    if (req.user.role === 'User') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Manager: only their dept
    if (req.user.role === 'Manager') {
      const managerDeptId = await getDeptId(req);
      const { rows: check } = await db.query(`
        SELECT e.department_id FROM customer_visits v
        LEFT JOIN employees e ON e.id = v.assigned_to WHERE v.id = $1
      `, [visitId]);
      if (check[0]?.department_id && managerDeptId && String(check[0].department_id) !== String(managerDeptId)) {
        return res.status(403).json({ error: 'Access denied — visit not in your department' });
      }
    }

    await db.query(`DELETE FROM customer_visits WHERE id = $1`, [visitId]);
    res.json({ message: 'Visit deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
