const router  = require('express').Router();
const multer  = require('multer');
const ExcelJS = require('exceljs');
const db      = require('../config/db');
const { verify, requireRole } = require('../middleware/auth');
const { sendMotivationalQuoteEmail } = require('../utils/mailer');
const { skipTodayIfTimeAlreadyPassed } = require('../utils/motivationalQuote');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET current settings + quote bank stats
router.get('/settings', verify, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM motivational_quote_settings WHERE id = 1');
    const cfg = rows[0];
    const { rows: totalRows } = await db.query('SELECT COUNT(*)::int AS total FROM motivational_quotes');
    const { rows: usedRows } = await db.query(
      'SELECT COUNT(*)::int AS used FROM motivational_quote_log WHERE cycle = $1', [cfg.current_cycle]
    );
    res.json({ ...cfg, total_quotes: totalRows[0].total, used_this_cycle: usedRows[0].used });
  } catch (err) {
    console.error('GET /motivational-quotes/settings error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// GET history of sent quotes (newest first)
router.get('/log', verify, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT l.id, l.sent_date::text, l.cycle, q.text AS quote_text
      FROM motivational_quote_log l
      JOIN motivational_quotes q ON q.id = l.quote_id
      ORDER BY l.sent_date DESC, l.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /motivational-quotes/log error:', err);
    res.status(500).json({ error: 'Failed to fetch quote log' });
  }
});

// PUT update enabled / send_time
router.put('/settings', verify, requireRole('Admin'), async (req, res) => {
  try {
    const { enabled, send_time } = req.body;
    const { rows } = await db.query(
      `UPDATE motivational_quote_settings SET
         enabled   = COALESCE($1, enabled),
         send_time = COALESCE($2, send_time)
       WHERE id = 1 RETURNING *`,
      [enabled, send_time]
    );
    const cfg = await skipTodayIfTimeAlreadyPassed(rows[0]);
    res.json(cfg);
  } catch (err) {
    console.error('PUT /motivational-quotes/settings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// POST import quotes from an uploaded .xlsx (single column of quote text, header row optional).
// Replaces the entire quote bank and resets the cycle, since re-importing implies a fresh list.
router.post('/import', verify, requireRole('Admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(req.file.buffer);
    const ws = wb.worksheets[0];
    if (!ws) return res.status(400).json({ error: 'The uploaded file has no worksheet' });

    const seen = new Set();
    const quotes = [];
    let duplicatesSkipped = 0;
    ws.eachRow((row) => {
      const cell = row.getCell(1).value;
      const text = (cell && typeof cell === 'object' && cell.richText)
        ? cell.richText.map(t => t.text).join('')
        : cell;
      const trimmed = text != null ? String(text).trim() : '';
      if (!trimmed || trimmed.toLowerCase() === 'quote') return;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) { duplicatesSkipped++; return; }
      seen.add(key);
      quotes.push(trimmed);
    });

    if (quotes.length === 0) return res.status(400).json({ error: 'No quote text found in the uploaded file' });

    await db.query('DELETE FROM motivational_quotes');
    for (const q of quotes) {
      await db.query('INSERT INTO motivational_quotes (text) VALUES ($1)', [q]);
    }
    await db.query('UPDATE motivational_quote_settings SET current_cycle = 1, last_sent_date = NULL, last_quote_id = NULL WHERE id = 1');

    res.json({ imported: quotes.length, duplicates_skipped: duplicatesSkipped });
  } catch (err) {
    console.error('POST /motivational-quotes/import error:', err);
    res.status(500).json({ error: 'Failed to import quotes: ' + err.message });
  }
});

// POST send a single quote to a test email address — does not touch the cycle/log
router.post('/test-send', verify, requireRole('Admin'), async (req, res) => {
  try {
    const email = (req.body.email || '').trim();
    if (!email) return res.status(400).json({ error: 'Email address is required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email format' });

    const { rows: qRows } = await db.query('SELECT text FROM motivational_quotes ORDER BY RANDOM() LIMIT 1');
    if (!qRows[0]) return res.status(400).json({ error: 'No quotes have been imported yet' });

    await sendMotivationalQuoteEmail({ toEmail: email, quoteText: qRows[0].text });
    res.json({ message: `Test quote sent to ${email}`, quote: qRows[0].text });
  } catch (err) {
    console.error('POST /motivational-quotes/test-send error:', err);
    res.status(500).json({ error: 'Failed to send test quote' });
  }
});

module.exports = router;