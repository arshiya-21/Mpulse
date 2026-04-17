const cron = require('node-cron');
const db   = require('../config/db');
const { sendWorklogDigestEmail } = require('./mailer');

async function runWorklogDigest() {
  try {
    const { rows: cfg } = await db.query(
      'SELECT email_notif, worklog_digest_enabled FROM system_settings WHERE id = 1'
    );
    if (!cfg[0]?.email_notif || !cfg[0]?.worklog_digest_enabled) {
      console.log('⏭️  Worklog digest disabled — skipping');
      return;
    }

    // All distinct managers (any role) who have at least one managed employee
    // and have an active account with an email address
    const { rows: managers } = await db.query(`
      SELECT DISTINCT m.id, m.name, m.email
      FROM employee_managers em
      JOIN employees m ON m.id = em.manager_id
      WHERE m.email   IS NOT NULL
        AND m.email   != ''
        AND m.status  = 'active'
    `);

    if (managers.length === 0) {
      console.log('⏭️  No managers with managed employees found — skipping worklog digest');
      return;
    }

    const today = new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata'
    });

    let sent = 0;
    for (const manager of managers) {
      // Today's tasks for all employees this manager oversees
      const { rows: tasks } = await db.query(`
        SELECT
          e.id              AS employee_id,
          e.name            AS employee_name,
          COALESCE(d.name, '—') AS department_name,
          t.id              AS task_id,
          p.name            AS project_name,
          t.category,
          t.work_type,
          t.spent_mins,
          t.status,
          COALESCE(t.description, '') AS description
        FROM tasks t
        JOIN employees   e ON e.id = t.employee_id
        LEFT JOIN departments d ON d.id = e.department_id
        JOIN projects    p ON p.id = t.project_id
        WHERE e.id IN (
          SELECT employee_id FROM employee_managers WHERE manager_id = $1
        )
          AND t.task_date = CURRENT_DATE
        ORDER BY e.name, t.id
      `, [manager.id]);

      if (tasks.length === 0) {
        console.log(`⏭️  No tasks today for ${manager.name}'s team — skipping`);
        continue;
      }

      // Group by employee
      const empMap = {};
      for (const t of tasks) {
        if (!empMap[t.employee_id]) {
          empMap[t.employee_id] = {
            name:       t.employee_name,
            department: t.department_name,
            totalMins:  0,
            entries:    []
          };
        }
        empMap[t.employee_id].totalMins += t.spent_mins;
        empMap[t.employee_id].entries.push(t);
      }

      try {
        await sendWorklogDigestEmail({
          toName:    manager.name,
          toEmail:   manager.email,
          date:      today,
          employees: Object.values(empMap),
        });
        sent++;
        console.log(`📧 Digest sent → ${manager.email} (${Object.keys(empMap).length} employees)`);
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
  cron.schedule('0 19 * * *', runWorklogDigest, { timezone: 'Asia/Kolkata' });
  console.log('⏰ Worklog digest cron scheduled (daily 19:00 Asia/Kolkata)');
}

module.exports = { startWorklogDigestCron };
