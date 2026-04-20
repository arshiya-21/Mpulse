const router = require('express').Router();
const db     = require('../config/db');
const { verify } = require('../middleware/auth');

// Helper: get user's department_id (fallback if not in JWT)
async function getDeptId(req) {
  if (req.user.department_id) return req.user.department_id;
  const { rows } = await db.query('SELECT department_id FROM employees WHERE id = $1', [req.user.userId]);
  return rows[0]?.department_id || null;
}

// GET all with filters
router.get('/', verify, async (req, res) => {
  try {
    const { from, to, emp_id, dept_id, category, tat } = req.query;
    let q = `
      SELECT t.id, TO_CHAR(t.task_date,'YYYY-MM-DD') AS task_date, t.employee_id, t.project_id, t.category,
             t.work_type, t.spent_mins,
             CASE
               WHEN p.is_recurring = TRUE OR p.end_date IS NULL THEN 0
               WHEN t.task_date > p.end_date THEN (t.task_date::date - p.end_date::date)::int
               ELSE 0
             END AS tat_days,
             t.status, t.description,
             t.created_at, t.updated_at,
             ROUND((t.spent_mins::NUMERIC / COALESCE(
               (SELECT daily_target_mins FROM system_settings WHERE id = 1 LIMIT 1), 510
             )) * 100, 2) AS utilization,
             e.name AS employee_name,
             d.name AS department,
             p.name AS project_name,
             p.end_date AS project_end_date
      FROM tasks t
      JOIN employees   e ON e.id = t.employee_id
      JOIN projects    p ON p.id = t.project_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE 1=1
    `;
    const params = [];
    if (from)     { params.push(from);     q += ` AND t.task_date    >= $${params.length}`; }
    if (to)       { params.push(to);       q += ` AND t.task_date    <= $${params.length}`; }
    if (emp_id)   { params.push(emp_id);   q += ` AND t.employee_id  = $${params.length}`; }
    if (dept_id)  { params.push(dept_id);  q += ` AND e.department_id = $${params.length}`; }
    if (category) { params.push(category); q += ` AND t.category     = $${params.length}`; }
    if (tat === 'delayed') q += ` AND t.tat_days > 0`;
    if (tat === 'on_time') q += ` AND t.tat_days = 0`;

    // Manager sees tasks for:
    //   1. Employees in their own department
    //   2. Direct reports from other departments (via employee_managers)
    if (req.user.role === 'Manager') {
      const managerDeptId = await getDeptId(req);
      params.push(req.user.userId);
      const mgrParam = params.length;
      if (managerDeptId) {
        params.push(managerDeptId);
        q += ` AND (
          e.department_id = $${params.length}
          OR e.id IN (SELECT em.employee_id FROM employee_managers em WHERE em.manager_id = $${mgrParam})
        )`;
      } else {
        q += ` AND e.id IN (SELECT em.employee_id FROM employee_managers em WHERE em.manager_id = $${mgrParam})`;
      }
    } else if (req.user.role === 'User') {
      // User sees only their own tasks
      params.push(req.user.userId);
      q += ` AND t.employee_id = $${params.length}`;
    }

    q += ' ORDER BY t.task_date DESC, t.id DESC';

    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST create
router.post('/', verify, async (req, res) => {
  try {
    let { task_date, employee_id, project_id, category, work_type = 'Planned', spent_mins, status = 'In Progress', description } = req.body;

    // User can only log tasks for themselves
    if (req.user.role === 'User') {
      employee_id = req.user.userId;
    }

    // Manager can only log tasks for employees in their dept
    if (req.user.role === 'Manager' && employee_id) {
      const managerDeptId = await getDeptId(req);
      const { rows: empCheck } = await db.query('SELECT department_id FROM employees WHERE id = $1', [employee_id]);
      if (empCheck[0] && managerDeptId && String(empCheck[0].department_id) !== String(managerDeptId)) {
        return res.status(403).json({ error: 'You can only log tasks for employees in your department' });
      }
    }

    if (!task_date || !employee_id || !project_id || !category || !spent_mins)
      return res.status(400).json({ error: 'task_date, employee_id, project_id, category, spent_mins are required' });

    const { rows: pr } = await db.query(`SELECT end_date, is_recurring FROM projects WHERE id = $1`, [project_id]);
    const projEnd    = pr[0]?.end_date ? new Date(pr[0].end_date) : null;
    const isRecurring = pr[0]?.is_recurring || false;
    const taskDt     = new Date(task_date);
    const tat_days   = (!isRecurring && projEnd && taskDt > projEnd)
      ? Math.ceil((taskDt - projEnd) / 86400000) : 0;

    const { rows } = await db.query(`
      INSERT INTO tasks (task_date, employee_id, project_id, category, work_type, spent_mins, tat_days, status, description)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *, utilization
    `, [task_date, employee_id, project_id, category, work_type, spent_mins, tat_days, status, description || null]);

    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT update
router.put('/:id', verify, async (req, res) => {
  try {
    const taskId = req.params.id;

    // User can only update their own tasks
    if (req.user.role === 'User') {
      const { rows: taskCheck } = await db.query('SELECT employee_id FROM tasks WHERE id = $1', [taskId]);
      if (!taskCheck[0] || String(taskCheck[0].employee_id) !== String(req.user.userId)) {
        return res.status(403).json({ error: 'You can only update your own tasks' });
      }
    }

    // Manager can only update tasks for their dept's employees
    if (req.user.role === 'Manager') {
      const managerDeptId = await getDeptId(req);
      const { rows: taskCheck } = await db.query(`
        SELECT t.employee_id, e.department_id FROM tasks t
        JOIN employees e ON e.id = t.employee_id WHERE t.id = $1
      `, [taskId]);
      if (taskCheck[0] && managerDeptId && String(taskCheck[0].department_id) !== String(managerDeptId)) {
        return res.status(403).json({ error: 'Access denied — task not in your department' });
      }
    }

    const { task_date, employee_id, project_id, category, work_type, spent_mins, tat_days, status, description } = req.body;
    const { rows } = await db.query(`
      UPDATE tasks SET
        task_date   = COALESCE($1, task_date),
        employee_id = COALESCE($2, employee_id),
        project_id  = COALESCE($3, project_id),
        category    = COALESCE($4, category),
        work_type   = COALESCE($5, work_type),
        spent_mins  = COALESCE($6, spent_mins),
        tat_days    = COALESCE($7, tat_days),
        status      = COALESCE($8, status),
        description = $10
      WHERE id = $9
      RETURNING *, utilization
    `, [task_date, employee_id, project_id, category, work_type, spent_mins, tat_days, status, taskId, description ?? null]);
    if (!rows.length) return res.status(404).json({ error: 'Task not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE
router.delete('/:id', verify, async (req, res) => {
  try {
    const taskId = req.params.id;

    // User can only delete their own tasks
    if (req.user.role === 'User') {
      const { rows: taskCheck } = await db.query('SELECT employee_id FROM tasks WHERE id = $1', [taskId]);
      if (!taskCheck[0] || String(taskCheck[0].employee_id) !== String(req.user.userId)) {
        return res.status(403).json({ error: 'You can only delete your own tasks' });
      }
    }

    // Manager can only delete tasks for their dept's employees
    if (req.user.role === 'Manager') {
      const managerDeptId = await getDeptId(req);
      const { rows: taskCheck } = await db.query(`
        SELECT e.department_id FROM tasks t
        JOIN employees e ON e.id = t.employee_id WHERE t.id = $1
      `, [taskId]);
      if (taskCheck[0] && managerDeptId && String(taskCheck[0].department_id) !== String(managerDeptId)) {
        return res.status(403).json({ error: 'Access denied — task not in your department' });
      }
    }

    await db.query(`DELETE FROM tasks WHERE id = $1`, [taskId]);
    res.json({ message: 'Task deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
