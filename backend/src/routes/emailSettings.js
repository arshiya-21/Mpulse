const express    = require('express');
const router     = express.Router();
const db         = require('../config/db');
const { verify } = require('../middleware/auth');
const { sendMail } = require('../utils/mailer');

// GET email settings
router.get('/', verify, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM email_settings LIMIT 1');
    res.json(rows[0] || {});
  } catch (err) {
    console.error('GET /email-settings error:', err);
    res.status(500).json({ error: 'Failed to fetch email settings' });
  }
});

// PUT update email settings
router.put('/', verify, async (req, res) => {
  try {
    const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, smtp_secure } = req.body;
    const { rows } = await db.query(`
      INSERT INTO email_settings (id, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, smtp_secure, updated_at)
      VALUES (1, $1,$2,$3,$4,$5,$6, NOW())
      ON CONFLICT (id) DO UPDATE SET
        smtp_host=$1, smtp_port=$2, smtp_user=$3, smtp_pass=$4,
        smtp_from=$5, smtp_secure=$6, updated_at=NOW()
      RETURNING *
    `, [smtp_host, smtp_port||587, smtp_user, smtp_pass, smtp_from, smtp_secure||false]);
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /email-settings error:', err);
    res.status(500).json({ error: 'Failed to update email settings' });
  }
});

// POST test email
router.post('/test', verify, async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ error: 'Recipient email required' });
    await sendMail({ to, subject: 'MPulse — Test Email', text: 'Email configuration is working!' });
    res.json({ message: 'Test email sent successfully' });
  } catch (err) {
    console.error('POST /email-settings/test error:', err);
    res.status(500).json({ error: err.message || 'Failed to send test email' });
  }
});

module.exports = router;
