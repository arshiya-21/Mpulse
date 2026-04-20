const router = require('express').Router();
const db     = require('../config/db');
const { verify, requireRole } = require('../middleware/auth');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Helper – compute TAT days server-side
// For closed/completed projects, ref = actual closure date (closed_at if stored, else today when it was closed)
// Using end_date as ref was wrong — it always gave TAT=0 regardless of how late the project closed.
function calcTAT(startDate, endDate, status, closedAt) {
  if (!startDate || !endDate) return { target_days: 0, actual_days: 0, tat_days: 0 };
  const today  = new Date();
  const start  = new Date(startDate);
  const end    = new Date(endDate);
  let   ref;
  if (['Closed','Completed'].includes(status)) {
    ref = closedAt ? new Date(closedAt) : today;
  } else {
    ref = today;
  }
  const target = Math.ceil((end   - start) / MS_PER_DAY) + 1;
  const actual = Math.max(1, Math.ceil((ref - start) / MS_PER_DAY) + 1);
  const tat    = Math.max(0, actual - target);
  return { target_days: target, actual_days: actual, tat_days: tat };
}

// Helper: get user's department_id (fallback if not in JWT)
async function getDeptId(req) {
  if (req.user.department_id) return req.user.department_id;
  const { rows } = await db.query('SELECT department_id FROM employees WHERE id = $1', [req.user.userId]);
  return rows[0]?.department_id || null;
}

// GET all with optional filters
router.get('/', verify, async (req, res) => {
  try {
    const { status, owner_id, dept_id } = req.query;
    let q = `
      SELECT p.*,
             TO_CHAR(p.start_date, 'YYYY-MM-DD') AS start_date,
             TO_CHAR(p.end_date,   'YYYY-MM-DD') AS end_date,
             TO_CHAR(p.closed_at,  'YYYY-MM-DD') AS closed_at,
             d.name AS department,
             e.name AS owner_name,
             (SELECT COUNT(*)::int FROM tasks t WHERE t.project_id = p.id) AS task_count,
             (SELECT COALESCE(SUM(t.spent_mins),0)::int FROM tasks t WHERE t.project_id = p.id) AS total_mins,
             COALESCE((
               SELECT json_agg(json_build_object('id', emp.id, 'name', emp.name))
               FROM project_assignees pa
               JOIN employees emp ON emp.id = pa.employee_id
               WHERE pa.project_id = p.id
             ), '[]') AS assignees
      FROM projects p
      LEFT JOIN departments d ON d.id = p.department_id
      LEFT JOIN employees   e ON e.id = p.owner_id
      WHERE 1=1
    `;
    const params = [];
    if (status)  { params.push(status);  q += ` AND p.status        = $${params.length}`; }
    if (owner_id){ params.push(owner_id);q += ` AND p.owner_id      = $${params.length}`; }
    if (dept_id) { params.push(dept_id); q += ` AND p.department_id = $${params.length}`; }

    // Manager sees:
    //   1. Projects in their own department
    //   2. Projects owned by or assigned to any of their direct reports (cross-dept)
    if (req.user.role === 'Manager') {
      const managerDeptId = await getDeptId(req);
      params.push(req.user.userId);
      const mgrParam = params.length;
      if (managerDeptId) {
        params.push(managerDeptId);
        q += ` AND (
          p.department_id = $${params.length}
          OR p.owner_id = $${mgrParam}
          OR p.owner_id IN (SELECT em.employee_id FROM employee_managers em WHERE em.manager_id = $${mgrParam})
          OR p.id IN (
            SELECT pa.project_id FROM project_assignees pa
            INNER JOIN employee_managers em ON em.employee_id = pa.employee_id
            WHERE em.manager_id = $${mgrParam}
          )
        )`;
      } else {
        q += ` AND (
          p.owner_id = $${mgrParam}
          OR p.owner_id IN (SELECT em.employee_id FROM employee_managers em WHERE em.manager_id = $${mgrParam})
          OR p.id IN (
            SELECT pa.project_id FROM project_assignees pa
            INNER JOIN employee_managers em ON em.employee_id = pa.employee_id
            WHERE em.manager_id = $${mgrParam}
          )
        )`;
      }
    }

    q += ' ORDER BY p.created_at DESC';

    const { rows } = await db.query(q, params);
    res.json(rows.map(p => ({ ...p, ...calcTAT(p.start_date, p.end_date, p.status, p.closed_at) })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET single
router.get('/:id', verify, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT p.*, d.name AS department, e.name AS owner_name
      FROM projects p
      LEFT JOIN departments d ON d.id = p.department_id
      LEFT JOIN employees   e ON e.id = p.owner_id
      WHERE p.id = $1
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Project not found' });
    const p = rows[0];

    // Manager can only view their own dept's projects
    if (req.user.role === 'Manager') {
      const managerDeptId = await getDeptId(req);
      if (managerDeptId && String(p.department_id) !== String(managerDeptId)) {
        return res.status(403).json({ error: 'Access denied — project not in your department' });
      }
    }

    res.json({ ...p, ...calcTAT(p.start_date, p.end_date, p.status) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST assignees
router.post('/:id/assignees', verify, requireRole('Admin','Manager'), async (req, res) => {
  try {
    const pid = req.params.id;

    // Manager can only manage assignees for their dept's projects
    if (req.user.role === 'Manager') {
      const managerDeptId = await getDeptId(req);
      const { rows } = await db.query('SELECT department_id FROM projects WHERE id = $1', [pid]);
      if (!rows[0] || String(rows[0].department_id) !== String(managerDeptId)) {
        return res.status(403).json({ error: 'Access denied — project not in your department' });
      }
    }

    const { employee_ids } = req.body;
    await db.query('DELETE FROM project_assignees WHERE project_id = $1', [pid]);
    if (employee_ids && employee_ids.length) {
      const vals = employee_ids.map((eid, i) => `($1, $${i+2})`).join(',');
      await db.query(`INSERT INTO project_assignees (project_id, employee_id) VALUES ${vals}`, [pid, ...employee_ids]);
    }
    res.json({ message: 'Assignees updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST create
router.post('/', verify, requireRole('Admin', 'Manager'), async (req, res) => {
  try {
    let { name, description, department_id, owner_id, status = 'Not Started', start_date, end_date, is_recurring = false } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name is required' });
    if (!is_recurring && (!start_date || !end_date))
      return res.status(400).json({ error: 'Start date and end date are required for non-recurring projects' });

    // Manager can only create projects in their own department
    if (req.user.role === 'Manager') {
      department_id = await getDeptId(req);
    }

    const { rows } = await db.query(`
      INSERT INTO projects (name, description, department_id, owner_id, status, start_date, end_date, is_recurring)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [name, description, department_id, owner_id, status,
        is_recurring ? null : start_date,
        is_recurring ? null : end_date,
        is_recurring]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT update
router.put('/:id', verify, requireRole('Admin', 'Manager'), async (req, res) => {
  try {
    const pid = req.params.id;

    // Manager can only update their dept's projects
    if (req.user.role === 'Manager') {
      const managerDeptId = await getDeptId(req);
      const { rows: pRows } = await db.query('SELECT department_id FROM projects WHERE id = $1', [pid]);
      if (!pRows[0] || String(pRows[0].department_id) !== String(managerDeptId)) {
        return res.status(403).json({ error: 'Access denied — project not in your department' });
      }
    }

    const { name, description, department_id, owner_id, status, start_date, end_date, closed_at: reqClosedAt, is_recurring } = req.body;

    // Set closed_at when transitioning to Closed/Completed
    const { rows: cur } = await db.query('SELECT status, closed_at FROM projects WHERE id = $1', [pid]);
    const wasOpen   = cur[0] && !['Closed','Completed'].includes(cur[0].status);
    const nowClosed = status && ['Closed','Completed'].includes(status);
    const setClosedAt = wasOpen && nowClosed;

    // Build SQL + params separately for recurring vs normal to avoid passing untyped
    // null params for $6/$7 when they're not referenced (PostgreSQL type-inference error)
    let sql, params;
    if (is_recurring === true) {
      // Dates cleared to NULL — no date params needed ($6 = pid)
      params = [name || null, description || null, department_id || null, owner_id || null, status || null,
                pid, setClosedAt, reqClosedAt || null, true];
      sql = `
        UPDATE projects SET
          name          = COALESCE($1, name),
          description   = COALESCE($2, description),
          department_id = COALESCE($3, department_id),
          owner_id      = COALESCE($4, owner_id),
          status        = COALESCE($5, status),
          start_date    = NULL,
          end_date      = NULL,
          closed_at     = CASE WHEN $7 THEN COALESCE($8::date, NOW()::date) ELSE closed_at END,
          is_recurring  = $9
        WHERE id = $6 RETURNING *, TO_CHAR(closed_at,'YYYY-MM-DD') AS closed_at
      `;
    } else {
      const recurringClause = is_recurring != null ? `, is_recurring = $11` : '';
      params = [name || null, description || null, department_id || null, owner_id || null, status || null,
                start_date || null, end_date || null,
                pid, setClosedAt, reqClosedAt || null, is_recurring ?? null];
      sql = `
        UPDATE projects SET
          name          = COALESCE($1, name),
          description   = COALESCE($2, description),
          department_id = COALESCE($3, department_id),
          owner_id      = COALESCE($4, owner_id),
          status        = COALESCE($5, status),
          start_date    = COALESCE($6, start_date),
          end_date      = COALESCE($7, end_date),
          closed_at     = CASE WHEN $9 THEN COALESCE($10::date, NOW()::date) ELSE closed_at END
          ${recurringClause}
        WHERE id = $8 RETURNING *, TO_CHAR(closed_at,'YYYY-MM-DD') AS closed_at
      `;
    }

    const { rows } = await db.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'Project not found' });
    const p = rows[0];
    res.json({ ...p, ...calcTAT(p.start_date, p.end_date, p.status, p.closed_at) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET project overview (per-employee task breakdown)
router.get('/:id/overview', verify, async (req, res) => {
  try {
    const pid = req.params.id;

    const { rows: pRows } = await db.query(`
      SELECT p.*,
             TO_CHAR(p.start_date,'YYYY-MM-DD') AS start_date,
             TO_CHAR(p.end_date,  'YYYY-MM-DD') AS end_date,
             e.name AS owner_name,
             d.name AS department,
             (SELECT COUNT(*)::int FROM project_assignees WHERE project_id = p.id) AS team_size
      FROM projects p
      LEFT JOIN employees   e ON e.id = p.owner_id
      LEFT JOIN departments d ON d.id = p.department_id
      WHERE p.id = $1
    `, [pid]);
    if (!pRows.length) return res.status(404).json({ error: 'Project not found' });
    const project = { ...pRows[0], ...calcTAT(pRows[0].start_date, pRows[0].end_date, pRows[0].status) };

    const { rows: cfg } = await db.query('SELECT daily_target_mins FROM system_settings WHERE id = 1');
    const targetMins = cfg[0]?.daily_target_mins || 510;

    // Per-employee stats: sessions = distinct task rows, avg_util = mean daily utilisation
    const { rows: empStats } = await db.query(`
      SELECT
        e.id, e.name,
        COUNT(t.id)::int                                          AS sessions,
        COALESCE(SUM(t.spent_mins), 0)::int                      AS total_mins,
        ROUND(AVG(t.spent_mins::numeric / $2 * 100), 1)          AS avg_util,
        TO_CHAR(MAX(t.task_date), 'Mon DD')                      AS last_active
      FROM tasks t
      JOIN employees e ON e.id = t.employee_id
      WHERE t.project_id = $1
      GROUP BY e.id, e.name
      ORDER BY total_mins DESC
    `, [pid, targetMins]);

    const totalMins = empStats.reduce((s, r) => s + r.total_mins, 0);

    res.json({
      project,
      targetMins,
      totalMins,
      employees: empStats.map(r => ({
        ...r,
        total_hours: +(r.total_mins / 60).toFixed(1),
        pct: totalMins > 0 ? Math.round(r.total_mins / totalMins * 100) : 0,
      }))
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE — blocked if tasks exist
router.delete('/:id', verify, requireRole('Admin', 'Manager'), async (req, res) => {
  try {
    const pid = req.params.id;

    // Manager can only delete their dept's projects
    if (req.user.role === 'Manager') {
      const managerDeptId = await getDeptId(req);
      const { rows: pRows } = await db.query('SELECT department_id FROM projects WHERE id = $1', [pid]);
      if (!pRows[0] || String(pRows[0].department_id) !== String(managerDeptId)) {
        return res.status(403).json({ error: 'Access denied — project not in your department' });
      }
    }

    const { rows } = await db.query(`SELECT id FROM tasks WHERE project_id = $1 LIMIT 1`, [pid]);
    if (rows.length)
      return res.status(400).json({ error: 'Cannot delete — tasks exist for this project' });
    await db.query(`DELETE FROM projects WHERE id = $1`, [pid]);
    res.json({ message: 'Project deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
