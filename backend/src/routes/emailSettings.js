const express    = require('express');
const router     = express.Router();
const db         = require('../config/db');
const { verify } = require('../middleware/auth');
const nodemailer = require('nodemailer');

// GET email settings
router.get('/', verify, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, from_email, is_configured, updated_at FROM email_settings WHERE id = 1 LIMIT 1');
    res.json(rows[0] || { from_email: '', is_configured: false });
  } catch (err) {
    console.error('GET /email-settings error:', err);
    res.status(500).json({ error: 'Failed to fetch email settings' });
  }
});

// PUT update email settings (from_email + optional app_password)
router.put('/', verify, async (req, res) => {
  try {
    const { from_email, app_password } = req.body;
    if (!from_email) {
      return res.status(400).json({ error: 'Gmail address is required' });
    }

    let rows;
    if (app_password && app_password.trim()) {
      // Update both email and password
      ({ rows } = await db.query(`
        INSERT INTO email_settings (id, from_email, app_password, is_configured, updated_at)
        VALUES (1, $1, $2, TRUE, NOW())
        ON CONFLICT (id) DO UPDATE SET
          from_email    = $1,
          app_password  = $2,
          is_configured = TRUE,
          updated_at    = NOW()
        RETURNING id, from_email, is_configured, updated_at
      `, [from_email.trim().toLowerCase(), app_password.trim()]));
    } else {
      // Update only email, keep existing password
      ({ rows } = await db.query(`
        INSERT INTO email_settings (id, from_email, is_configured, updated_at)
        VALUES (1, $1, TRUE, NOW())
        ON CONFLICT (id) DO UPDATE SET
          from_email    = $1,
          is_configured = TRUE,
          updated_at    = NOW()
        RETURNING id, from_email, is_configured, updated_at
      `, [from_email.trim().toLowerCase()]));
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /email-settings error:', err);
    res.status(500).json({ error: 'Failed to update email settings' });
  }
});

// POST test email — sends a test to the configured from_email address
router.post('/test', verify, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT from_email, app_password FROM email_settings WHERE id = 1 LIMIT 1');
    const s = rows[0];
    if (!s?.from_email || !s?.app_password) {
      return res.status(400).json({ error: 'Email not configured yet. Save your Gmail address and App Password first.' });
    }

    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
      port:   parseInt(process.env.SMTP_PORT || '465'),
      secure: (process.env.SMTP_SECURE || 'true') === 'true',
      family: 4,
      auth: {
        user: process.env.SMTP_USER || s.from_email,
        pass: process.env.SMTP_PASS || s.app_password,
      },
      connectionTimeout: 10000,
      greetingTimeout:   10000,
      socketTimeout:     15000,
    });

    await transporter.sendMail({
      from:    `"MPulse" <${s.from_email}>`,
      to:      s.from_email,
      subject: 'MPulse — Test Email',
      text:    'Your email configuration is working correctly!',
    });

    res.json({ message: `Test email sent to ${s.from_email}` });
  } catch (err) {
    console.error('POST /email-settings/test error:', err);
    res.status(500).json({ error: err.message || 'Failed to send test email' });
  }
});

module.exports = router;
