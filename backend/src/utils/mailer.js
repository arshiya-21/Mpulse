const { Resend } = require('resend');
const db         = require('../config/db');

// ── Fetch email config from email_settings table ──────────
async function getEmailConfig() {
  const { rows } = await db.query(`SELECT * FROM email_settings WHERE id = 1 LIMIT 1`);
  const s = rows[0];
  if (!s?.from_email || !s?.app_password)
    throw new Error('Email not configured. Go to Master Data → Email Config to set it up.');
  return { fromEmail: s.from_email, appPassword: s.app_password };
}

// ── Send NEW USER email with temporary password ───────────
async function sendNewUserEmail({ toName, toEmail, tempPassword, loginUrl, isResend: isResendEmail = false }) {
  const { fromEmail, appPassword } = await getEmailConfig();

  const resendClient = new Resend(appPassword);

  const mailOptions = {
    from: `"MPulse" <${fromEmail}>`,
    to: toEmail,
    subject: isResendEmail ? '🔐 Your New MPulse Login Credentials' : '🎉 Welcome to MPulse — Your Account is Ready',
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
            ${isResendEmail ? `Hi ${toName},` : `Welcome ${toName}! 🎉`}
          </p>
          <p style="font-size:14px;color:#4b5563;line-height:1.7;margin:0 0 24px;">
            ${isResendEmail
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

  await resendClient.emails.send(mailOptions);
  console.log(`📧 ${isResendEmail ? 'Password reset' : 'Welcome'} email sent to ${toEmail}`);
}

// ── Send invite email (existing functionality) ────────────
async function sendInviteEmail({ toName, toEmail, inviteUrl, expiresIn = '48 hours' }) {
  const { fromEmail, appPassword } = await getEmailConfig();

  const resendClient = new Resend(appPassword);

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

  await resendClient.emails.send(mailOptions);
  console.log(`📧 Invite email sent to ${toEmail}`);
}

// ── Send VISIT SCHEDULED notification email ───────────────
async function sendVisitScheduledEmail({ toEmail, ccEmails = [], customerName, contactPerson, agenda, plannedDate, duration, assignedTo, channel }) {
  const { fromEmail, appPassword } = await getEmailConfig();

  const resendClient = new Resend(appPassword);

  const dateStr = plannedDate ? String(plannedDate).slice(0, 10) : '—';
  const subject = `New Visit Scheduled – ${customerName} on ${dateStr}`;

  const mailOptions = {
    from: `"MPulse" <${fromEmail}>`,
    to:   toEmail,
    cc:   ccEmails.length ? ccEmails : undefined,
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

  await resendClient.emails.send(mailOptions);
  console.log(`📧 Visit scheduled notification sent to ${toEmail}${ccEmails.length ? ` (CC: ${ccEmails.join(', ')})` : ''}`);
  return subject;
}

// ── Send VISIT reminder email (upcoming / overdue) ────────
async function sendVisitDueEmail({ toName, toEmail, customerName, contactPerson, agenda, plannedDate, assignedToName, isAdmin, type = 'overdue' }) {
  const { fromEmail, appPassword } = await getEmailConfig();

  const resendClient = new Resend(appPassword);

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

  await resendClient.emails.send(mailOptions);
  console.log(`📧 Visit ${type} reminder sent to ${toEmail}`);
}

// ── Send WORKLOG DIGEST email to a manager ────────────────
async function sendWorklogDigestEmail({ toName, toEmail, date, employees }) {
  const { fromEmail, appPassword } = await getEmailConfig();
  const resendClient = new Resend(appPassword);

  function fmtMins(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}` : `${m}m`;
  }

  const totalMins    = employees.reduce((s, e) => s + e.totalMins, 0);
  const totalEntries = employees.reduce((s, e) => s + e.entries.length, 0);

  const employeeBlocks = employees.map(emp => `
    <div style="margin-bottom:18px;border:1px solid #e4e7ec;border-radius:10px;overflow:hidden;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:11px 16px;background:#eef2ff;">
            <span style="font-size:14px;font-weight:700;color:#1e1b4b;">${emp.name}</span>
            ${emp.department ? `<span style="font-size:11px;color:#6366f1;background:#e0e7ff;padding:2px 8px;border-radius:20px;margin-left:8px;">${emp.department}</span>` : ''}
          </td>
          <td style="padding:11px 16px;background:#eef2ff;text-align:right;white-space:nowrap;">
            <span style="font-size:13px;font-weight:700;color:#4f46e5;background:#fff;padding:3px 12px;border-radius:20px;border:1px solid #c7d2fe;">${fmtMins(emp.totalMins)} worked</span>
          </td>
        </tr>
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#f8f9fb;">
            <th style="padding:7px 12px;text-align:left;color:#6b7280;font-weight:600;border-bottom:1px solid #e4e7ec;">Project</th>
            <th style="padding:7px 12px;text-align:left;color:#6b7280;font-weight:600;border-bottom:1px solid #e4e7ec;">Category</th>
            <th style="padding:7px 12px;text-align:left;color:#6b7280;font-weight:600;border-bottom:1px solid #e4e7ec;">Type</th>
            <th style="padding:7px 12px;text-align:center;color:#6b7280;font-weight:600;border-bottom:1px solid #e4e7ec;white-space:nowrap;">Time</th>
          </tr>
        </thead>
        <tbody>
          ${emp.entries.map((entry, i) => `
            <tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'};">
              <td style="padding:8px 12px;color:#111827;font-weight:600;border-bottom:1px solid #f0f2f5;">
                ${entry.project_name}
                ${entry.description ? `<div style="font-size:11px;color:#9ca3af;font-weight:400;margin-top:2px;">${entry.description}</div>` : ''}
              </td>
              <td style="padding:8px 12px;color:#4b5563;border-bottom:1px solid #f0f2f5;">${entry.category || '—'}</td>
              <td style="padding:8px 12px;color:#4b5563;border-bottom:1px solid #f0f2f5;">${entry.work_type || '—'}</td>
              <td style="padding:8px 12px;text-align:center;color:#4f46e5;font-weight:700;border-bottom:1px solid #f0f2f5;font-family:monospace;">${entry.spent_mins}m</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `).join('');

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;background:#fff;border:1px solid #e4e7ec;border-radius:12px;overflow:hidden;">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#1e1b4b,#312e81);padding:28px 32px;">
        <div style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.02em;">MPulse</div>
        <div style="font-size:13px;color:#a5b4fc;margin-top:4px;">Daily Work Log Digest</div>
      </div>

      <!-- Body -->
      <div style="padding:28px 32px;">
        <p style="font-size:15px;font-weight:600;color:#111827;margin:0 0 4px;">Hi ${toName},</p>
        <p style="font-size:13px;color:#4b5563;line-height:1.7;margin:0 0 20px;">
          Here is the work log summary for your team on <strong>${date}</strong>.
        </p>

        <!-- Summary strip -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr>
            <td style="padding:0 6px 0 0;">
              <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;padding:14px;text-align:center;">
                <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:4px;">Active Employees</div>
                <div style="font-size:22px;font-weight:800;color:#4f46e5;">${employees.length}</div>
              </div>
            </td>
            <td style="padding:0 3px;">
              <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:14px;text-align:center;">
                <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:4px;">Total Entries</div>
                <div style="font-size:22px;font-weight:800;color:#059669;">${totalEntries}</div>
              </div>
            </td>
            <td style="padding:0 0 0 6px;">
              <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px;text-align:center;">
                <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:4px;">Total Time</div>
                <div style="font-size:22px;font-weight:800;color:#d97706;">${fmtMins(totalMins)}</div>
              </div>
            </td>
          </tr>
        </table>

        <!-- Employee blocks -->
        ${employeeBlocks}
      </div>

      <!-- Footer -->
      <div style="padding:16px 32px;background:#f8f9fb;border-top:1px solid #e4e7ec;text-align:center;">
        <p style="font-size:11px;color:#9ca3af;margin:0;">© ${new Date().getFullYear()} MPM Infosoft · MPulse Platform</p>
        <p style="font-size:10px;color:#9ca3af;margin:6px 0 0;">Automated daily digest sent at 7:00 PM IST</p>
      </div>
    </div>
  `;

  await resendClient.emails.send({
    from:    `"MPulse" <${fromEmail}>`,
    to:      toEmail,
    subject: `📋 Daily Work Log — Your Team · ${date}`,
    html,
  });
  console.log(`📧 Worklog digest sent to ${toEmail}`);
}

// ── Send NO-LOG ALERT email when none of a manager's team logged today ────
async function sendNoLogAlertEmail({ toName, toEmail, date, teamMembers = [] }) {
  const { fromEmail, appPassword } = await getEmailConfig();
  const resendClient = new Resend(appPassword);

  const memberRows = teamMembers.map((m, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'};">
      <td style="padding:8px 14px;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #f0f2f5;">${m.name}</td>
      <td style="padding:8px 14px;font-size:12px;color:#6b7280;border-bottom:1px solid #f0f2f5;">${m.department_name}</td>
      <td style="padding:8px 14px;text-align:center;border-bottom:1px solid #f0f2f5;">
        <span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#fef2f2;color:#dc2626;">Not Logged</span>
      </td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e4e7ec;border-radius:12px;overflow:hidden;">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#1e1b4b,#312e81);padding:28px 32px;">
        <div style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.02em;">MPulse</div>
        <div style="font-size:13px;color:#a5b4fc;margin-top:4px;">Daily Work Log Alert</div>
      </div>

      <!-- Alert Banner -->
      <div style="background:#fef2f2;border-bottom:2px solid #fca5a5;padding:16px 32px;display:flex;align-items:center;gap:12px;">
        <span style="font-size:22px;">⚠️</span>
        <div>
          <div style="font-size:14px;font-weight:700;color:#dc2626;">No Work Logged Today</div>
          <div style="font-size:12px;color:#b91c1c;margin-top:2px;">None of your team members have logged work for <strong>${date}</strong></div>
        </div>
      </div>

      <!-- Body -->
      <div style="padding:28px 32px;">
        <p style="font-size:15px;font-weight:600;color:#111827;margin:0 0 6px;">Hi ${toName},</p>
        <p style="font-size:13px;color:#4b5563;line-height:1.7;margin:0 0 20px;">
          This is an automated reminder that <strong>no work log entries</strong> have been recorded by your team on <strong>${date}</strong>.
          Please follow up with the team members listed below.
        </p>

        ${teamMembers.length > 0 ? `
        <!-- Team Member Table -->
        <div style="border:1px solid #e4e7ec;border-radius:10px;overflow:hidden;margin-bottom:20px;">
          <div style="background:#f8f9fb;padding:10px 14px;border-bottom:1px solid #e4e7ec;">
            <span style="font-size:11px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Team Members — ${teamMembers.length} total</span>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#f8f9fb;">
                <th style="padding:8px 14px;text-align:left;font-size:11px;font-weight:700;color:#9ca3af;border-bottom:1px solid #e4e7ec;">Name</th>
                <th style="padding:8px 14px;text-align:left;font-size:11px;font-weight:700;color:#9ca3af;border-bottom:1px solid #e4e7ec;">Department</th>
                <th style="padding:8px 14px;text-align:center;font-size:11px;font-weight:700;color:#9ca3af;border-bottom:1px solid #e4e7ec;">Status</th>
              </tr>
            </thead>
            <tbody>${memberRows}</tbody>
          </table>
        </div>
        ` : ''}

        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;font-size:12px;color:#92400e;line-height:1.6;">
          Please remind your team to log their daily work on MPulse before end of day.
        </div>
      </div>

      <!-- Footer -->
      <div style="padding:16px 32px;background:#f8f9fb;border-top:1px solid #e4e7ec;text-align:center;">
        <p style="font-size:11px;color:#9ca3af;margin:0;">© ${new Date().getFullYear()} MPM Infosoft · MPulse Platform</p>
        <p style="font-size:10px;color:#9ca3af;margin:6px 0 0;">Automated daily digest sent at 7:00 PM IST</p>
      </div>
    </div>
  `;

  await resendClient.emails.send({
    from:    `"MPulse" <${fromEmail}>`,
    to:      toEmail,
    subject: `⚠️ No Work Logged Today — Your Team · ${date}`,
    html,
  });
  console.log(`📧 No-log alert sent to ${toEmail}`);
}

module.exports = { sendInviteEmail, sendNewUserEmail, sendVisitDueEmail, sendVisitScheduledEmail, sendWorklogDigestEmail, sendNoLogAlertEmail };