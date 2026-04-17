const cron = require('node-cron');
const db   = require('../config/db');
const { sendWorklogDigestEmail } = require('./mailer');

async function runWorklogDigest() {
  try {
    const { rows: cfg } = await db.query(
      'SELECT email_notif FROM system_settings WHERE id = 1'
    );
    const settings = cfg[0];

    if (!settings?.email_notif) {
      console.log('⏭️  Worklog digest disabled — email_notif is off');
      return;
    }

    // Find all active managers who have an email and a department
    const { rows: managers } = await db.query(`
      SELECT e.id, e.name, e.email, e.department_id, d.name AS department_name
      FROM employees e
      JOIN roles       r ON r.id = e.role_id
      JOIN departments d ON d.id = e.department_id
      WHERE r.name = 'Manager'
        AND e.email IS NOT NULL AND e.email != ''
        AND e.status = 'active'
    `);

    if (managers.length === 0) {
      console.log('⏭️  No active managers with email found — skipping worklog digest');
      return;
    }

    const today = new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata'
    });

    let sent = 0;
    for (const manager of managers) {
      // Today's tasks for all employees in this department
      const { rows: tasks } = await db.query(`
        SELECT
          e.id            AS employee_id,
          e.name          AS employee_name,
          t.id            AS task_id,
          p.name          AS project_name,
          t.category,
          t.work_type,
          t.spent_mins,
          t.status,
          COALESCE(t.description, '') AS description
        FROM tasks t
        JOIN employees e ON e.id = t.employee_id
        JOIN projects  p ON p.id = t.project_id
        WHERE e.department_id = $1
          AND t.task_date = CURRENT_DATE
        ORDER BY e.name, t.id
      `, [manager.department_id]);

      if (tasks.length === 0) {
        console.log(`⏭️  No tasks today for ${manager.department_name} — skipping`);
        continue;
      }

      // Group by employee
      const empMap = {};
      for (const t of tasks) {
        if (!empMap[t.employee_id]) {
          empMap[t.employee_id] = { name: t.employee_name, totalMins: 0, entries: [] };
        }
        empMap[t.employee_id].totalMins += t.spent_mins;
        empMap[t.employee_id].entries.push(t);
      }

      try {
        await sendWorklogDigestEmail({
          toName:         manager.name,
          toEmail:        manager.email,
          departmentName: manager.department_name,
          date:           today,
          employees:      Object.values(empMap),
        });
        sent++;
        console.log(`📧 Digest sent → ${manager.email} (${manager.department_name})`);
      } catch (e) {
        console.error(`⚠️  Worklog digest to ${manager.email} failed:`, e.message);
      }
    }

    console.log(`✅ Worklog digest complete — sent to ${sent} manager(s)`);
  } catch (err) {
    console.error('❌ Worklog digest error:', err.message);
  }
}

function startWorklogDigestCron() {
  // Only runs on schedule — never on startup
  cron.schedule('0 19 * * *', runWorklogDigest, { timezone: 'Asia/Kolkata' });
  console.log('⏰ Worklog digest cron scheduled (daily 19:00 Asia/Kolkata)');
}

module.exports = { startWorklogDigestCron };
