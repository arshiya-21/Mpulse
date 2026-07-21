const cron = require('node-cron');
const db   = require('../config/db');
const { sendMotivationalQuoteEmail } = require('./mailer');

function todayIST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
}
function nowISTTime() {
  return new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
}
// last_sent_date comes back from pg as a Date object representing local
// midnight of that calendar day. Comparing it via .toISOString() (UTC) shifts
// it back a day for any positive UTC offset (e.g. IST), so the "already sent
// today" guard never matched and the cron re-sent every minute. Format both
// sides the same way, in the same explicit timezone, to compare safely.
function toIsoDate(d) {
  return d ? new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : null;
}

// Picks a quote for the given cycle that hasn't been used yet this cycle.
// Rolls over to a new cycle (and clears "used" implicitly) once all quotes
// in the current cycle have been sent.
async function pickQuote() {
  const { rows: totalRows } = await db.query('SELECT COUNT(*)::int AS total FROM motivational_quotes');
  if (totalRows[0].total === 0) throw new Error('No quotes have been imported yet.');

  const { rows: cfgRows } = await db.query('SELECT current_cycle FROM motivational_quote_settings WHERE id = 1');
  let cycle = cfgRows[0].current_cycle;

  let { rows: candidates } = await db.query(
    `SELECT id, text FROM motivational_quotes
     WHERE id NOT IN (SELECT quote_id FROM motivational_quote_log WHERE cycle = $1)`,
    [cycle]
  );

  if (candidates.length === 0) {
    cycle += 1;
    await db.query('UPDATE motivational_quote_settings SET current_cycle = $1 WHERE id = 1', [cycle]);
    ({ rows: candidates } = await db.query('SELECT id, text FROM motivational_quotes'));
  }

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  return { quote: chosen, cycle };
}

const DAY_IDX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
async function isWorkingDayToday() {
  const { rows } = await db.query('SELECT work_days FROM system_settings WHERE id = 1');
  const workDays = rows[0]?.work_days || 'Mon–Fri';
  const parts = workDays.replace('–', '-').split('-').map(d => d.trim().slice(0, 3));
  const startIdx = DAY_IDX[parts[0]] ?? 1;
  const endIdx = DAY_IDX[parts[1]] ?? 5;
  const todayIdx = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getDay();
  return todayIdx >= startIdx && todayIdx <= endIdx;
}

// force=true bypasses the enabled/working-day/time/already-sent-today checks (used by "Test")
async function runDailyQuote({ force = false } = {}) {
  const { rows: cfgRows } = await db.query('SELECT * FROM motivational_quote_settings WHERE id = 1');
  const cfg = cfgRows[0];

  if (!force) {
    if (!cfg.enabled) return { skipped: true, reason: 'Daily quotes are disabled' };
    if (toIsoDate(cfg.last_sent_date) === todayIST()) {
      return { skipped: true, reason: 'Already sent today' };
    }
    // Strict equality, not "time has passed" — the cron ticks every minute (needed since the
    // send time is configurable from the UI, not a fixed cron pattern), but only the one tick
    // that matches exactly is allowed to actually send. Every other minute is a single cheap
    // SELECT + string compare, no retry loop.
    if (nowISTTime() !== cfg.send_time) return { skipped: true, reason: 'Not the scheduled send time' };
    if (!(await isWorkingDayToday())) return { skipped: true, reason: 'Not a working day' };
  }

  const { rows: recipients } = await db.query(
    `SELECT email FROM employees WHERE receives_daily_quote = TRUE AND status = 'active' AND email IS NOT NULL AND email != ''`
  );
  if (recipients.length === 0) return { skipped: true, reason: 'No recipients selected — check the "Quote" column in Master Data → Employees' };

  const { quote, cycle } = await pickQuote();

  let sent = 0;
  for (const r of recipients) {
    try {
      await sendMotivationalQuoteEmail({ toEmail: r.email, quoteText: quote.text });
      sent++;
    } catch (e) {
      console.error(`⚠️  Motivational quote to ${r.email} failed:`, e.message);
    }
  }

  const today = todayIST();
  await db.query('INSERT INTO motivational_quote_log (quote_id, cycle, sent_date) VALUES ($1, $2, $3)', [quote.id, cycle, today]);
  await db.query('UPDATE motivational_quote_settings SET last_sent_date = $1, last_quote_id = $2 WHERE id = 1', [today, quote.id]);

  console.log(`✅ Daily quote sent individually to ${sent}/${recipients.length} recipient(s) — cycle ${cycle}`);
  return { sent, total: recipients.length, quote: quote.text, cycle };
}

function startMotivationalQuoteCron() {
  // Still checks every minute (needed since the send time is configurable from the UI, not a
  // fixed cron pattern) — but only ever sends on the one tick that exactly matches send_time.
  cron.schedule('* * * * *', () => {
    runDailyQuote().catch(e => console.error('❌ Motivational quote cron error:', e.message));
  }, { timezone: 'Asia/Kolkata' });
  console.log('⏰ Motivational quote cron scheduled (sends only on the exact configured minute)');
}

module.exports = { startMotivationalQuoteCron, runDailyQuote, pickQuote };
