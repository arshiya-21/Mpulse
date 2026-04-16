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

// GET /api/reports/count — lightweight row count for current filters
router.get('/count', verify, async (req, res) => {
  try {
    const { from, to, emp_id, proj_id, status } = req.query;
    const dept_id = req.user.role === 'Admin' ? req.query.dept_id : req.user.department_id;
    let q = `SELECT COUNT(*)::int AS total FROM tasks t
             JOIN employees e ON e.id = t.employee_id
             JOIN projects  p ON p.id = t.project_id
             WHERE 1=1`;
    const params = [];
    if (from)    { params.push(from);    q += ` AND t.task_date     >= $${params.length}`; }
    if (to)      { params.push(to);      q += ` AND t.task_date     <= $${params.length}`; }
    if (emp_id)  { params.push(emp_id);  q += ` AND t.employee_id   = $${params.length}`; }
    if (dept_id) { params.push(dept_id); q += ` AND e.department_id = $${params.length}`; }
    if (proj_id) { params.push(proj_id); q += ` AND t.project_id    = $${params.length}`; }
    if (status)  { params.push(status);  q += ` AND t.status        = $${params.length}`; }
    const { rows } = await db.query(q, params);
    res.json({ count: rows[0].total });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/reports/export?from=&to=&emp_id=&dept_id=&proj_id=&status=
router.get('/export', verify, async (req, res) => {
  try {
    const { from, to, emp_id, proj_id, status } = req.query;
    // Non-admin users are restricted to their own department
    const dept_id = req.user.role === 'Admin' ? req.query.dept_id : req.user.department_id;
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

// GET /api/reports/export/xlsx — Excel export with styled header
router.get('/export/xlsx', verify, async (req, res) => {
  try {
    const { from, to, emp_id, proj_id, status } = req.query;
    const dept_id = req.user.role === 'Admin' ? req.query.dept_id : req.user.department_id;
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
    if (from)    { params.push(from);    q += ` AND t.task_date     >= $${params.length}`; }
    if (to)      { params.push(to);      q += ` AND t.task_date     <= $${params.length}`; }
    if (emp_id)  { params.push(emp_id);  q += ` AND t.employee_id   = $${params.length}`; }
    if (dept_id) { params.push(dept_id); q += ` AND e.department_id = $${params.length}`; }
    if (proj_id) { params.push(proj_id); q += ` AND t.project_id    = $${params.length}`; }
    if (status)  { params.push(status);  q += ` AND t.status        = $${params.length}`; }
    q += ' ORDER BY t.task_date DESC';

    const { rows } = await db.query(q, params);

    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    wb.creator = 'MPulse';
    const ws = wb.addWorksheet('Task Report');

    const headers = [
      'Month','Created On','Employee','Department','Project','Task Category',
      'Work Type','Spent Mins','Productive Hours','Utilization %',
      'Project Start','Project End','TAT Days','TAT Status','Task Status','Project Status'
    ];

    ws.addRow(headers);
    const hRow = ws.getRow(1);
    hRow.eachCell(cell => {
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border    = { bottom: { style: 'thin', color: { argb: 'FFCDD5F0' } } };
    });
    hRow.height = 20;
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    rows.forEach((r, i) => {
      const row = ws.addRow([
        r.month_label, r.created_on ? String(r.created_on).slice(0,10) : '',
        r.employee, r.department, r.project, r.task_category,
        r.work_type, r.spent_mins, r.productive_hours, r.utilization_pct,
        r.project_start ? String(r.project_start).slice(0,10) : '',
        r.project_end   ? String(r.project_end).slice(0,10)   : '',
        r.tat_days, r.tat_status, r.task_status, r.project_status
      ]);
      if (i % 2 === 0) {
        row.eachCell(cell => {
          cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFF5F5FF' } };
        });
      }
    });

    // Auto-width
    ws.columns.forEach(col => {
      let max = 10;
      col.eachCell({ includeEmpty: true }, cell => {
        const len = cell.value ? String(cell.value).length : 0;
        if (len > max) max = len;
      });
      col.width = Math.min(max + 4, 40);
    });

    const buf = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition',
      `attachment; filename="mpulse_report_${new Date().toISOString().slice(0,10)}.xlsx"`);
    res.send(buf);
  } catch (e) {
    console.error('GET /reports/export/xlsx error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/reports/summary?type=daily|weekly|employee|project|status&from=&to=&emp_id=&dept_id=&proj_id=&status=
router.get('/summary', verify, async (req, res) => {
  try {
    const { type = 'daily', from, to, emp_id, proj_id, status } = req.query;
    const dept_id = req.user.role === 'Admin' ? req.query.dept_id : req.user.department_id;

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