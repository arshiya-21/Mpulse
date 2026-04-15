const router = require('express').Router();
const db     = require('../config/db');
const { verify } = require('../middleware/auth');

// Convert array of objects → CSV string
function toCSV(rows) {
  if (!rows.length) return 'No data found';
  const headers = Object.keys(rows[0]);
  const escape  = v => `"${String(v ?? '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;
  return [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(','))
  ].join('\n');
}

// GET /api/reports/export?from=&to=&emp_id=&dept_id=&proj_id=&status=
router.get('/export', verify, async (req, res) => {
  try {
    const { from, to, emp_id, dept_id, proj_id, status } = req.query;
    let q = `
      SELECT
        TO_CHAR(t.task_date, 'Month YYYY')     AS month_label,
        t.created_at::date                     AS created_on,
        e.name                                 AS employee,
        d.name                                 AS department,
        p.name                                 AS project,
        t.category                             AS task_category,
        t.work_type,
        t.spent_mins,
        ROUND(t.spent_mins::numeric / 60, 2)   AS productive_hours,
        ROUND(t.utilization, 2)                AS utilization_pct,
        p.start_date                           AS project_start,
        p.end_date                             AS project_end,
        t.tat_days,
        CASE WHEN t.tat_days > 0 THEN 'Delayed' ELSE 'On Time' END AS tat_status,
        t.status                               AS task_status,
        p.status                               AS project_status
      FROM tasks t
      JOIN employees   e ON e.id = t.employee_id
      JOIN projects    p ON p.id = t.project_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE 1=1
    `;
    const params = [];
    if (from)    { params.push(from);    q += ` AND t.task_date      >= $${params.length}`; }
    if (to)      { params.push(to);      q += ` AND t.task_date      <= $${params.length}`; }
    if (emp_id)  { params.push(emp_id);  q += ` AND t.employee_id    = $${params.length}`; }
    if (dept_id) { params.push(dept_id); q += ` AND e.department_id  = $${params.length}`; }
    if (proj_id) { params.push(proj_id); q += ` AND t.project_id     = $${params.length}`; }
    if (status)  { params.push(status);  q += ` AND t.status         = $${params.length}`; }
    q += ' ORDER BY t.task_date DESC';

    const { rows } = await db.query(q, params);
    const csv = toCSV(rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition',
      `attachment; filename="mpulse_report_${new Date().toISOString().slice(0,10)}.csv"`
    );
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/reports/summary?type=daily|weekly|employee|project|status&from=&to=&emp_id=&dept_id=&proj_id=&status=
router.get('/summary', verify, async (req, res) => {
  try {
    const { type = 'daily', from, to, emp_id, dept_id, proj_id, status } = req.query;

    const BASE = `
      FROM tasks t
      JOIN employees   e ON e.id = t.employee_id
      JOIN projects    p ON p.id = t.project_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE 1=1
    `;
    const params = [];
    let where = '';
    if (from)    { params.push(from);    where += ` AND t.task_date   >= $${params.length}`; }
    if (to)      { params.push(to);      where += ` AND t.task_date   <= $${params.length}`; }
    if (emp_id)  { params.push(emp_id);  where += ` AND t.employee_id = $${params.length}`; }
    if (dept_id) { params.push(dept_id); where += ` AND e.department_id = $${params.length}`; }
    if (proj_id) { params.push(proj_id); where += ` AND t.project_id  = $${params.length}`; }
    if (status)  { params.push(status);  where += ` AND t.status      = $${params.length}`; }

    const UTIL_SUB = `(SELECT COALESCE(daily_target_mins,510) FROM system_settings WHERE id=1 LIMIT 1)`;

    let q;
    if (type === 'weekly') {
      q = `SELECT TO_CHAR(DATE_TRUNC('week',t.task_date),'YYYY-MM-DD') AS week_start,
             COUNT(*)::int AS tasks, COUNT(DISTINCT t.employee_id)::int AS employees,
             COUNT(DISTINCT t.project_id)::int AS projects,
             SUM(t.spent_mins)::int AS total_mins,
             ROUND(SUM(t.spent_mins)::numeric/60,1) AS total_hours,
             ROUND(AVG(ROUND((t.spent_mins::numeric/${UTIL_SUB})*100,2)),1) AS avg_util_pct
           ${BASE}${where} GROUP BY week_start ORDER BY week_start`;
    } else if (type === 'employee') {
      q = `SELECT e.name AS employee, d.name AS department,
             COUNT(*)::int AS tasks, COUNT(DISTINCT t.project_id)::int AS projects,
             SUM(t.spent_mins)::int AS total_mins,
             ROUND(SUM(t.spent_mins)::numeric/60,1) AS total_hours,
             ROUND(AVG(ROUND((t.spent_mins::numeric/${UTIL_SUB})*100,2)),1) AS avg_util_pct,
             COUNT(CASE WHEN t.tat_days > 0 THEN 1 END)::int AS delayed_tasks,
             MAX(TO_CHAR(t.task_date,'YYYY-MM-DD')) AS last_active
           ${BASE}${where} GROUP BY e.id, e.name, d.name ORDER BY e.name`;
    } else if (type === 'project') {
      q = `SELECT p.name AS project, p.status AS project_status,
             TO_CHAR(p.start_date,'YYYY-MM-DD') AS start_date,
             TO_CHAR(p.end_date,'YYYY-MM-DD') AS end_date,
             COUNT(*)::int AS tasks, COUNT(DISTINCT t.employee_id)::int AS contributors,
             SUM(t.spent_mins)::int AS total_mins,
             ROUND(SUM(t.spent_mins)::numeric/60,1) AS total_hours,
             ROUND(AVG(ROUND((t.spent_mins::numeric/${UTIL_SUB})*100,2)),1) AS avg_util_pct,
             MAX(t.tat_days)::int AS max_tat_days
           ${BASE}${where} GROUP BY p.id, p.name, p.status, p.start_date, p.end_date ORDER BY p.name`;
    } else if (type === 'status') {
      q = `SELECT t.status AS work_status,
             COUNT(*)::int AS tasks, COUNT(DISTINCT t.employee_id)::int AS employees,
             COUNT(DISTINCT t.project_id)::int AS projects,
             SUM(t.spent_mins)::int AS total_mins,
             ROUND(SUM(t.spent_mins)::numeric/60,1) AS total_hours,
             ROUND(AVG(ROUND((t.spent_mins::numeric/${UTIL_SUB})*100,2)),1) AS avg_util_pct
           ${BASE}${where} GROUP BY t.status ORDER BY t.status`;
    } else {
      // daily (default)
      q = `SELECT TO_CHAR(t.task_date,'YYYY-MM-DD') AS date,
             COUNT(*)::int AS tasks, COUNT(DISTINCT t.employee_id)::int AS employees,
             COUNT(DISTINCT t.project_id)::int AS projects,
             SUM(t.spent_mins)::int AS total_mins,
             ROUND(SUM(t.spent_mins)::numeric/60,1) AS total_hours,
             ROUND(AVG(ROUND((t.spent_mins::numeric/${UTIL_SUB})*100,2)),1) AS avg_util_pct
           ${BASE}${where} GROUP BY date ORDER BY date DESC`;
    }

    const { rows } = await db.query(q, params);
    const csv = toCSV(rows);
    const label = type.charAt(0).toUpperCase() + type.slice(1);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition',
      `attachment; filename="mpulse_${type}_summary_${new Date().toISOString().slice(0,10)}.csv"`
    );
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;