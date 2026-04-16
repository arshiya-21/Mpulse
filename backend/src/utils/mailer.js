const nodemailer = require('nodemailer');
const db         = require('../config/db');

// ── SMTP transport ────────────────────────────────────────────
function getSmtpTransport(fromEmail, appPassword) {
  return nodemailer.createTransport({
    host:   'smtp.resend.com',
    port:   465,
    secure: true,
    auth: {
      user: 'resend',
      pass: appPassword,
    },
    connectionTimeout: 10000,
    greetingTimeout:   10000,
    socketTimeout:     15000,
  });
}

// ── Fetch email config from email_settings table ──────────
async function getEmailConfig() {
  const { rows } = await db.query(`SELECT * FROM email_settings WHERE id = 1 LIMIT 1`);
  const s = rows[0];
  if (!s?.from_email || !s?.app_password)
    throw new Error('Email not configured. Go to Master Data → Email Config to set it up.');
  return { fromEmail: s.from_email, appPassword: s.app_password };
}

// ── Send NEW USER email with temporary password ───────────
async function sendNewUserEmail({ toName, toEmail, tempPassword, loginUrl, isResend = false }) {
  const { fromEmail, appPassword } = await getEmailConfig();

  const transporter = getSmtpTransport(fromEmail, appPassword);

  const mailOptions = {
    from: `"MPulse" <${fromEmail}>`,
    to: toEmail,
    subject: isResend ? '🔐 Your New MPulse Login Credentials' : '🎉 Welcome to MPulse — Your Account is Ready',
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:540px;margin:0 auto;background:#fff;border:1px solid #e4e7ec;border-radius:12px;overflow:hidden;">
        
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#1e1b4b,#312e81);padding:28px 32px;text-align:center;">
          <div style="font-size:28px;margin-bottom:8px;">✅</div>
          <div style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.02em;">MPulse</div>
          <div style="font-size:13px;color:#a5b4fc;margin-top:4px;">Work · Pulse · Intelligence</div>
        </div>

        <!-- Body -->
        <div style="padding:32px;">
          <p style="font-size:16px;font-weight:600;color:#111827;margin:0 0 8px;">
            ${isResend ? `Hi ${toName},` : `Welcome ${toName}! 🎉`}
          </p>
          <p style="font-size:14px;color:#4b5563;line-height:1.7;margin:0 0 24px;">
            ${isResend 
              ? 'Your login credentials have been reset. Use the details below to sign in to your MPulse account.' 
              : 'Your account has been created by your administrator. Use the credentials below to sign in to MPulse.'}
          </p>

          <!-- Credentials Box -->
          <div style="background:#f0f9ff;border:2px solid #3b82f6;border-radius:10px;padding:20px;margin:0 0 24px;">
            <div style="font-size:13px;font-weight:700;color:#1e3a8a;margin:0 0 16px;text-transform:uppercase;letter-spacing:0.5px;">
              🔐 Your Login Credentials
            </div>
            
            <div style="margin:0 0 12px;">
              <div style="font-size:11px;color:#64748b;margin:0 0 4px;font-weight:600;">EMAIL</div>
              <div style="font-size:14px;color:#1e3a8a;font-weight:600;font-family:monospace;background:#fff;padding:8px 12px;border-radius:6px;">${toEmail}</div>
            </div>
            
            <div>
              <div style="font-size:11px;color:#64748b;margin:0 0 4px;font-weight:600;">TEMPORARY PASSWORD</div>
              <div style="font-size:16px;color:#dc2626;font-weight:700;font-family:monospace;background:#fff;padding:10px 12px;border-radius:6px;letter-spacing:1px;">${tempPassword}</div>
            </div>
          </div>

          <!-- CTA Button -->
          <div style="text-align:center;margin:28px 0;">
            <a href="${loginUrl}" 
               style="display:inline-block;padding:13px 32px;background:#4f46e5;color:#fff;
                      font-size:15px;font-weight:600;border-radius:8px;text-decoration:none;
                      box-shadow:0 4px 14px rgba(79,70,229,0.35);">
              Sign In to MPulse →
            </a>
          </div>

          <!-- Password Reset Warning -->
          <div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:8px;padding:14px 16px;margin:0 0 20px;">
            <div style="font-size:13px;font-weight:700;color:#d97706;margin:0 0 6px;">⚠️ Password Reset Required</div>
            <p style="font-size:12px;color:#92400e;margin:0;line-height:1.6;">
              After logging in with this temporary password, you will be asked to create a new password that meets these requirements:
            </p>
            <ul style="font-size:12px;color:#92400e;margin:8px 0 0;padding-left:20px;line-height:1.6;">
              <li>At least 8 characters long</li>
              <li>At least 1 uppercase letter (A-Z)</li>
              <li>At least 1 number (0-9)</li>
              <li>At least 1 special character (!@#$%)</li>
            </ul>
          </div>

          <!-- Security Tips -->
          <div style="background:#f8f9fb;border:1px solid #e4e7ec;border-radius:8px;padding:14px 16px;">
            <p style="font-size:12px;color:#6b7280;margin:0 0 6px;">🔒 <strong>Security Tips:</strong></p>
            <p style="font-size:11px;color:#6b7280;margin:0 0 4px;">• Keep your credentials confidential</p>
            <p style="font-size:11px;color:#6b7280;margin:0 0 4px;">• Never share your password with anyone</p>
            <p style="font-size:11px;color:#6b7280;margin:0;">• Change your password immediately after first login</p>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding:16px 32px;background:#f8f9fb;border-top:1px solid #e4e7ec;text-align:center;">
          <p style="font-size:11px;color:#9ca3af;margin:0;">
            © ${new Date().getFullYear()} MPM Infosoft · MPulse Platform
          </p>
          <p style="font-size:10px;color:#9ca3af;margin:6px 0 0;">
            Need help? Contact your system administrator
          </p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
  console.log(`📧 ${isResend ? 'Password reset' : 'Welcome'} email sent to ${toEmail}`);
}

// ── Send invite email (existing functionality) ────────────
async function sendInviteEmail({ toName, toEmail, inviteUrl, expiresIn = '48 hours' }) {
  const { fromEmail, appPassword } = await getEmailConfig();

  const transporter = getSmtpTransport(fromEmail, appPassword);

  const mailOptions = {
    from: `"MPulse" <${fromEmail}>`,
    to: toEmail,
    subject: `You're invited to MPulse — Set your password`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;background:#fff;border:1px solid #e4e7ec;border-radius:12px;overflow:hidden;">
        
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#1e1b4b,#312e81);padding:28px 32px;text-align:center;">
          <div style="font-size:28px;margin-bottom:8px;">✅</div>
          <div style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.02em;">MPulse</div>
          <div style="font-size:13px;color:#a5b4fc;margin-top:4px;">Work · Pulse · Intelligence</div>
        </div>

        <!-- Body -->
        <div style="padding:32px;">
          <p style="font-size:16px;font-weight:600;color:#111827;margin:0 0 8px;">Hi ${toName},</p>
          <p style="font-size:14px;color:#4b5563;line-height:1.7;margin:0 0 24px;">
            You've been added to <strong>MPulse</strong> by your administrator.<br/>
            Click the button below to set your password and activate your account.
          </p>

          <!-- CTA Button -->
          <div style="text-align:center;margin:28px 0;">
            <a href="${inviteUrl}" 
               style="display:inline-block;padding:13px 32px;background:#4f46e5;color:#fff;
                      font-size:15px;font-weight:600;border-radius:8px;text-decoration:none;
                      box-shadow:0 4px 14px rgba(79,70,229,0.35);">
              Set My Password →
            </a>
          </div>

          <!-- Link fallback -->
          <p style="font-size:12px;color:#9ca3af;margin:0 0 6px;">Or copy this link into your browser:</p>
          <p style="font-size:12px;color:#4f46e5;word-break:break-all;margin:0 0 24px;">${inviteUrl}</p>

          <!-- Warnings -->
          <div style="background:#f8f9fb;border:1px solid #e4e7ec;border-radius:8px;padding:14px 16px;">
            <p style="font-size:12px;color:#6b7280;margin:0 0 6px;">⏰ This link expires in <strong>${expiresIn}</strong></p>
            <p style="font-size:12px;color:#6b7280;margin:0 0 6px;">🔒 One-time use — once used it becomes invalid</p>
            <p style="font-size:12px;color:#6b7280;margin:0;">📧 If you didn't expect this, please ignore this email</p>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding:16px 32px;background:#f8f9fb;border-top:1px solid #e4e7ec;text-align:center;">
          <p style="font-size:11px;color:#9ca3af;margin:0;">
            © ${new Date().getFullYear()} MPM Infosoft · MPulse Platform
          </p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
  console.log(`📧 Invite email sent to ${toEmail}`);
}

// ── Send VISIT SCHEDULED notification email ───────────────
async function sendVisitScheduledEmail({ toEmail, ccEmails = [], customerName, contactPerson, agenda, plannedDate, duration, assignedTo, channel }) {
  const { fromEmail, appPassword } = await getEmailConfig();

  const transporter = getSmtpTransport(fromEmail, appPassword);

  const dateStr = plannedDate ? String(plannedDate).slice(0, 10) : '—';
  const subject = `New Visit Scheduled – ${customerName} on ${dateStr}`;

  const mailOptions = {
    from: `"MPulse" <${fromEmail}>`,
    to:   toEmail,
    cc:   ccEmails.length ? ccEmails.join(', ') : undefined,
    subject,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;background:#fff;border:1px solid #e4e7ec;border-radius:12px;overflow:hidden;">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#1e1b4b,#312e81);padding:28px 32px;">
          <div style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.02em;">MPulse</div>
          <div style="font-size:13px;color:#a5b4fc;margin-top:4px;">New Customer Visit Scheduled</div>
        </div>

        <!-- Body -->
        <div style="padding:28px 32px;">
          <p style="font-size:15px;font-weight:600;color:#111827;margin:0 0 6px;">Hi Admin,</p>
          <p style="font-size:13px;color:#4b5563;line-height:1.7;margin:0 0 24px;">
            A new customer visit has been scheduled. Please review the details below and ensure the visit is executed on time.
          </p>

          <!-- Details Table -->
          <div style="background:#f8f9fb;border:1px solid #e4e7ec;border-radius:10px;padding:20px;margin:0 0 24px;">
            <div style="font-size:11px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 14px;">Visit Details</div>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="font-size:12px;color:#9ca3af;padding:5px 0;width:38%;vertical-align:top;">Customer</td><td style="font-size:13px;font-weight:600;color:#111827;padding:5px 0;">${customerName}</td></tr>
              ${contactPerson ? `<tr><td style="font-size:12px;color:#9ca3af;padding:5px 0;">Contact Person</td><td style="font-size:13px;color:#374151;padding:5px 0;">${contactPerson}</td></tr>` : ''}
              <tr><td style="font-size:12px;color:#9ca3af;padding:5px 0;">Agenda</td><td style="font-size:13px;color:#374151;padding:5px 0;">${agenda}</td></tr>
              <tr><td style="font-size:12px;color:#9ca3af;padding:5px 0;">Planned Date</td><td style="font-size:13px;font-weight:700;color:#059669;padding:5px 0;">${dateStr}</td></tr>
              ${duration ? `<tr><td style="font-size:12px;color:#9ca3af;padding:5px 0;">Duration</td><td style="font-size:13px;color:#374151;padding:5px 0;">${duration}</td></tr>` : ''}
              ${assignedTo ? `<tr><td style="font-size:12px;color:#9ca3af;padding:5px 0;">Assigned To</td><td style="font-size:13px;color:#374151;padding:5px 0;">${assignedTo}</td></tr>` : ''}
              ${channel ? `<tr><td style="font-size:12px;color:#9ca3af;padding:5px 0;">Channel</td><td style="font-size:13px;color:#374151;padding:5px 0;">${channel}</td></tr>` : ''}
            </table>
          </div>

          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;font-size:12px;color:#92400e;line-height:1.6;">
            Kindly ensure the visit is executed on time and the status is updated once completed.
          </div>
        </div>

        <!-- Footer -->
        <div style="padding:16px 32px;background:#f8f9fb;border-top:1px solid #e4e7ec;text-align:center;">
          <p style="font-size:11px;color:#9ca3af;margin:0;">© ${new Date().getFullYear()} MPM Infosoft · MPulse – Workpulse System</p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
  console.log(`📧 Visit scheduled notification sent to ${toEmail}${ccEmails.length ? ` (CC: ${ccEmails.join(', ')})` : ''}`);
  return subject;
}

// ── Send VISIT reminder email (upcoming / overdue) ────────
async function sendVisitDueEmail({ toName, toEmail, customerName, contactPerson, agenda, plannedDate, assignedToName, isAdmin, type = 'overdue' }) {
  const { fromEmail, appPassword } = await getEmailConfig();

  const transporter = getSmtpTransport(fromEmail, appPassword);

  const dateStr = new Date(plannedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const isUpcoming = type === 'upcoming';

  // Labels / colours per type
  const meta = isUpcoming
    ? { icon: '📅', accent: '#2563eb', label: 'Tomorrow', borderColor: '#3b82f6', badgeBg: '#dbeafe', badgeColor: '#1d4ed8', badgeText: 'Scheduled Tomorrow' }
    : { icon: '⚠️', accent: '#dc2626', label: 'Overdue',  borderColor: '#dc2626', badgeBg: '#fef2f2', badgeColor: '#b91c1c', badgeText: 'Overdue — Action Required' };

  const bodyText = isAdmin
    ? isUpcoming
      ? `A customer visit assigned to <strong>${assignedToName || 'an employee'}</strong> is scheduled for <strong>tomorrow</strong>. Please ensure everything is in order.`
      : `A customer visit assigned to <strong>${assignedToName || 'an employee'}</strong> is <span style="color:#dc2626;font-weight:700;">overdue</span> and has not been completed. Please follow up immediately.`
    : isUpcoming
      ? `You have a customer visit scheduled for <strong>tomorrow</strong>. Please prepare and ensure you are ready.`
      : `Your customer visit is <span style="color:#dc2626;font-weight:700;">overdue</span> and has not been marked as completed. Please update the visit status in MPulse.`;

  const mailOptions = {
    from: `"MPulse" <${fromEmail}>`,
    to: toEmail,
    subject: isUpcoming
      ? `📅 Visit Tomorrow — ${customerName}`
      : `⚠️ Overdue Visit — ${customerName}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:540px;margin:0 auto;background:#fff;border:1px solid #e4e7ec;border-radius:12px;overflow:hidden;">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#1e1b4b,#312e81);padding:28px 32px;text-align:center;">
          <div style="font-size:28px;margin-bottom:8px;">${meta.icon}</div>
          <div style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.02em;">MPulse</div>
          <div style="font-size:13px;color:#a5b4fc;margin-top:4px;">Visit Reminder</div>
        </div>

        <!-- Body -->
        <div style="padding:32px;">
          <!-- Badge -->
          <div style="display:inline-block;padding:5px 14px;border-radius:20px;background:${meta.badgeBg};color:${meta.badgeColor};font-size:12px;font-weight:700;margin-bottom:18px;">${meta.icon} ${meta.badgeText}</div>

          <p style="font-size:16px;font-weight:600;color:#111827;margin:0 0 8px;">Hi ${toName},</p>
          <p style="font-size:14px;color:#4b5563;line-height:1.7;margin:0 0 24px;">${bodyText}</p>

          <!-- Visit Details Box -->
          <div style="background:#f8faff;border:2px solid ${meta.borderColor};border-radius:10px;padding:20px;margin:0 0 24px;">
            <div style="font-size:12px;font-weight:700;color:#1e3a8a;margin:0 0 14px;text-transform:uppercase;letter-spacing:0.5px;">
              📋 Visit Details
            </div>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="font-size:12px;color:#64748b;padding:5px 0;width:40%;">Customer</td><td style="font-size:13px;font-weight:600;color:#111827;">${customerName}</td></tr>
              ${contactPerson ? `<tr><td style="font-size:12px;color:#64748b;padding:5px 0;">Contact</td><td style="font-size:13px;color:#374151;">${contactPerson}</td></tr>` : ''}
              <tr><td style="font-size:12px;color:#64748b;padding:5px 0;">Agenda</td><td style="font-size:13px;color:#374151;">${agenda}</td></tr>
              <tr><td style="font-size:12px;color:#64748b;padding:5px 0;">Planned Date</td><td style="font-size:13px;font-weight:700;color:${meta.accent};">${dateStr} <span style="font-size:11px;">(${meta.label})</span></td></tr>
              ${isAdmin && assignedToName ? `<tr><td style="font-size:12px;color:#64748b;padding:5px 0;">Assigned To</td><td style="font-size:13px;color:#374151;">${assignedToName}</td></tr>` : ''}
            </table>
          </div>

          <p style="font-size:12px;color:#9ca3af;margin:0;">Please log in to MPulse to ${isUpcoming ? 'prepare for' : 'update'} this visit.</p>
        </div>

        <!-- Footer -->
        <div style="padding:16px 32px;background:#f8f9fb;border-top:1px solid #e4e7ec;text-align:center;">
          <p style="font-size:11px;color:#9ca3af;margin:0;">© ${new Date().getFullYear()} MPM Infosoft · MPulse Platform</p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
  console.log(`📧 Visit ${type} reminder sent to ${toEmail}`);
}

module.exports = { sendInviteEmail, sendNewUserEmail, sendVisitDueEmail, sendVisitScheduledEmail };