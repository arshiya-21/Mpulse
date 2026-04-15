const cron = require('node-cron');
const db   = require('../config/db');
const { sendVisitDueEmail } = require('./mailer');

async function runVisitReminders() {
  try {
    const { rows: cfg } = await db.query(
      'SELECT admin_email, visit_reminder_enabled, email_notif, timezone FROM system_settings WHERE id = 1'
    );
    const settings = cfg[0];

    if (!settings?.email_notif || !settings?.visit_reminder_enabled) {
      console.log('⏭️  Visit reminders disabled — skipping');
      return;
    }

    const BASE_QUERY = `
      SELECT v.id, v.planned_date, v.agenda, v.contact_person,
             c.name  AS customer_name,
             e.name  AS assigned_to_name,
             e.email AS assigned_to_email
      FROM customer_visits v
      JOIN customers  c ON c.id = v.customer_id
      LEFT JOIN employees e ON e.id = v.assigned_to
    `;

    // Ensure tracking column exists (safe to run repeatedly)
    await db.query(`
      ALTER TABLE customer_visits
        ADD COLUMN IF NOT EXISTS reminder_sent_date DATE
    `).catch(() => {});

    // 1) Upcoming: visits scheduled for tomorrow (status = Planned) — not yet reminded today
    const { rows: upcomingVisits } = await db.query(
      BASE_QUERY + `WHERE v.status = 'Planned'
        AND v.planned_date = CURRENT_DATE + INTERVAL '1 day'
        AND (v.reminder_sent_date IS NULL OR v.reminder_sent_date < CURRENT_DATE)`
    );

    // 2) Overdue: past planned date, not resolved — not yet reminded today
    const { rows: overdueVisits } = await db.query(
      BASE_QUERY + `WHERE v.status NOT IN ('Completed','Cancelled')
        AND v.planned_date < CURRENT_DATE
        AND (v.reminder_sent_date IS NULL OR v.reminder_sent_date < CURRENT_DATE)`
    );

    const total = upcomingVisits.length + overdueVisits.length;
    if (total === 0) {
      console.log('✅ No visit reminders to send');
      return;
    }

    console.log(`📋 ${upcomingVisits.length} upcoming / ${overdueVisits.length} overdue — sending reminders`);

    async function notify(visit, type) {
      // Mark as reminded TODAY first — prevents duplicates if cron fires again
      await db.query(
        `UPDATE customer_visits SET reminder_sent_date = CURRENT_DATE WHERE id = $1`,
        [visit.id]
      ).catch(() => {});

      if (visit.assigned_to_email) {
        try {
          await sendVisitDueEmail({
            toName:        visit.assigned_to_name,
            toEmail:       visit.assigned_to_email,
            customerName:  visit.customer_name,
            contactPerson: visit.contact_person,
            agenda:        visit.agenda,
            plannedDate:   visit.planned_date,
            isAdmin:       false,
            type,
          });
        } catch (e) {
          console.error(`⚠️  Reminder to ${visit.assigned_to_email} failed:`, e.message);
        }
      }
      if (settings.admin_email) {
        try {
          await sendVisitDueEmail({
            toName:         'Admin',
            toEmail:        settings.admin_email,
            customerName:   visit.customer_name,
            contactPerson:  visit.contact_person,
            agenda:         visit.agenda,
            plannedDate:    visit.planned_date,
            assignedToName: visit.assigned_to_name,
            isAdmin:        true,
            type,
          });
        } catch (e) {
          console.error(`⚠️  Reminder to admin failed:`, e.message);
        }
      }
    }

    for (const visit of upcomingVisits) await notify(visit, 'upcoming');
    for (const visit of overdueVisits)  await notify(visit, 'overdue');

    console.log('✅ Visit reminders done');
  } catch (err) {
    console.error('❌ Visit reminder error:', err.message);
  }
}

function startVisitReminderCron() {
  // Only run on schedule — never on startup (prevents spam on server restart)
  cron.schedule('0 9 * * *', runVisitReminders, { timezone: 'Asia/Kolkata' });
  console.log('⏰ Visit reminder cron scheduled (daily 09:00 Asia/Kolkata)');
}

module.exports = { startVisitReminderCron };
