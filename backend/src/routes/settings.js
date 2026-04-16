const express = require('express');
const router  = express.Router();
const db      = require('../config/db');

// ── GET: Fetch system settings ────────────────────────────
router.get('/', async (req, res) => {
  try {
    // Auto-add work_formulas column if it doesn't exist yet
    await db.query(`ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS work_formulas TEXT`).catch(()=>{});

    const { rows } = await db.query('SELECT * FROM system_settings WHERE id = 1 LIMIT 1');
    if (!rows[0]) {
      // Initialize with defaults if not exists
      await db.query(`
        INSERT INTO system_settings
          (company_name, daily_target_mins, work_days, timezone, tat_alert_days,
           email_notif, auto_close, session_timeout, admin_email, visit_reminder_enabled)
        VALUES
          ('My Company', 510, 'Mon–Fri', 'Asia/Kolkata', 2, true, false, 30, NULL, true)
        ON CONFLICT DO NOTHING
      `);
      const { rows: newRows } = await db.query('SELECT * FROM system_settings WHERE id = 1');
      return res.json(newRows[0]);
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ GET /settings error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// ── PUT: Update system settings ───────────────────────────
router.put('/', async (req, res) => {
  try {
    const {
      company_name,
      daily_target_mins,
      work_days,
      timezone,
      tat_alert_days,
      email_notif,
      auto_close,
      session_timeout,
      admin_email,
      visit_reminder_enabled,
      work_categories,
      work_formulas
    } = req.body;

    // Validation
    if (!company_name || company_name.trim().length === 0) {
      return res.status(400).json({ error: 'Company name is required' });
    }
    if (!daily_target_mins || daily_target_mins < 1 || daily_target_mins > 1440) {
      return res.status(400).json({ error: 'Daily target must be between 1 and 1440 minutes' });
    }
    if (!timezone || timezone.trim().length === 0) {
      return res.status(400).json({ error: 'Timezone is required' });
    }
    if (!tat_alert_days || tat_alert_days < 1 || tat_alert_days > 365) {
      return res.status(400).json({ error: 'TAT alert threshold must be between 1 and 365 days' });
    }
    if (session_timeout == null || (session_timeout !== 0 && (session_timeout < 5 || session_timeout > 1440))) {
      return res.status(400).json({ error: 'Session timeout must be 0 (no timeout) or between 5 and 1440 minutes' });
    }

    // Validate admin_email if provided
    if (admin_email && admin_email.trim().length > 0 &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin_email.trim())) {
      return res.status(400).json({ error: 'Invalid admin email format' });
    }

    // Update settings (always id = 1)
    const { rows } = await db.query(`
      UPDATE system_settings
      SET
        company_name            = $1,
        daily_target_mins       = $2,
        work_days               = $3,
        timezone                = $4,
        tat_alert_days          = $5,
        email_notif             = $6,
        auto_close              = $7,
        session_timeout         = $8,
        admin_email             = $9,
        visit_reminder_enabled  = $10,
        work_categories         = COALESCE($11, work_categories),
        work_formulas           = COALESCE($12, work_formulas)
      WHERE id = 1
      RETURNING *
    `, [
      company_name.trim(),
      daily_target_mins,
      work_days,
      timezone.trim(),
      tat_alert_days,
      email_notif,
      auto_close,
      session_timeout,
      admin_email ? admin_email.trim() : null,
      visit_reminder_enabled ?? true,
      work_categories ? (Array.isArray(work_categories) ? JSON.stringify(work_categories) : work_categories) : null,
      work_formulas ? (Array.isArray(work_formulas) ? JSON.stringify(work_formulas) : work_formulas) : null
    ]);

    console.log('✅ System settings updated');
    res.json({ message: 'Settings saved successfully', data: rows[0] });
  } catch (err) {
    console.error('❌ PUT /settings error:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

module.exports = router;