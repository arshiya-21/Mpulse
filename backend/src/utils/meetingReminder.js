const cron = require('node-cron');
const db   = require('../config/db');
const { sendMeetingReminderEmail } = require('./mailer');

const DAY_MAP = { 0:'Sun', 1:'Mon', 2:'Tue', 3:'Wed', 4:'Thu', 5:'Fri', 6:'Sat' };

async function runMeetingReminders() {
  try {
    // Current time in Asia/Kolkata
    const now   = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const hh    = String(now.getHours()).padStart(2, '0');
    const mm    = String(now.getMinutes()).padStart(2, '0');
    const today = DAY_MAP[now.getDay()];
    const todayDate = now.toISOString().slice(0, 10);

    const { rows: meetings } = await db.query(`SELECT * FROM project_meetings`);

    for (const m of meetings) {
      // Compute reminder fire time = meeting_time - reminder_mins
      const [mH, mM] = m.meeting_time.slice(0, 5).split(':').map(Number);
      const totalMins = mH * 60 + mM - m.reminder_mins;
      const fireH = String(Math.floor(((totalMins % 1440) + 1440) % 1440 / 60)).padStart(2, '0');
      const fireM = String(((totalMins % 60) + 60) % 60).padStart(2, '0');

      if (`${hh}:${mm}` !== `${fireH}:${fireM}`) continue;

      // For Weekly — check today is in days list
      if (m.schedule_type === 'Weekly') {
        const activeDays = (m.days || '').split(',').map(d => d.trim());
        if (!activeDays.includes(today)) continue;
      }

      // Skip if already reminded today
      if (m.last_reminded_at) {
        const lastDate = new Date(m.last_reminded_at).toISOString().slice(0, 10);
        if (lastDate === todayDate) continue;
      }

      // Get project name + assignees + owner emails
      const { rows: proj } = await db.query(`
        SELECT p.name, p.owner_id,
               e.email AS owner_email, e.name AS owner_name
        FROM projects p
        LEFT JOIN employees e ON e.id = p.owner_id
        WHERE p.id = $1
      `, [m.project_id]);
      if (!proj[0]) continue;

      const { rows: assignees } = await db.query(`
        SELECT e.email, e.name
        FROM project_assignees pa
        JOIN employees e ON e.id = pa.employee_id
        WHERE pa.project_id = $1 AND e.status = 'active'
      `, [m.project_id]);

      // Collect unique recipients (assignees + owner)
      const recipients = [...assignees];
      if (proj[0].owner_email && !recipients.some(r => r.email === proj[0].owner_email)) {
        recipients.push({ email: proj[0].owner_email, name: proj[0].owner_name });
      }

      const meetingTime = m.meeting_time.slice(0, 5);

      for (const r of recipients) {
        if (!r.email) continue;
        try {
          await sendMeetingReminderEmail({
            toEmail:     r.email,
            toName:      r.name,
            projectName: proj[0].name,
            meetingTime,
            meetingLink: m.meeting_link,
            reminderMins: m.reminder_mins,
          });
        } catch (e) {
          console.error(`❌ Meeting reminder email failed for ${r.email}:`, e.message);
        }
      }

      // Mark reminded
      await db.query(`UPDATE project_meetings SET last_reminded_at = NOW() WHERE id = $1`, [m.id]);
    }
  } catch (e) {
    console.error('❌ meetingReminder error:', e.message);
  }
}

function startMeetingReminderCron() {
  // Run every minute
  cron.schedule('* * * * *', runMeetingReminders, { timezone: 'Asia/Kolkata' });
  console.log('⏰ Meeting reminder cron started');
}

module.exports = { startMeetingReminderCron };
