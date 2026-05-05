const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ── POST: Login ───────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
      

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const { rows } = await db.query(`
      SELECT
        e.id, e.name, e.email, e.password_hash, e.status,
        e.invite_status, e.department_id, e.secondary_department_id, e.role_id, e.manager_id,
        r.name as role_name
      FROM employees e
      LEFT JOIN roles r ON e.role_id = r.id
      WHERE e.email = $1
    `, [email.toLowerCase().trim()]);

    if (!rows[0]) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];

    // Check if account is active
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is inactive. Please contact administrator.' });
    }

    // Verify password
    if (!user.password_hash) {
      return res.status(401).json({ error: 'Account setup incomplete. Please contact administrator.' });
    }
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if first-time login (pending invite status)
    if (user.invite_status === 'pending') {
      // Generate a special token for password reset
      const resetToken = jwt.sign(
        { userId: user.id, email: user.email, action: 'first_time_reset' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      return res.json({
        requirePasswordReset: true,
        resetToken: resetToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });
    }

    // Generate regular login token (expiry based on session_timeout setting)
    const { rows: stRows } = await db.query('SELECT session_timeout FROM system_settings WHERE id = 1 LIMIT 1');
    const sessionMins = stRows[0]?.session_timeout ?? 0;
    const expiresIn = sessionMins === 0 ? '365d' : `${sessionMins}m`;

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role_name, department_id: user.department_id },
      JWT_SECRET,
      { expiresIn }
    );

    console.log('✅ User logged in:', user.email);

    res.json({
      message: 'Login successful',
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role_name,
        department_id: user.department_id,
        secondary_department_id: user.secondary_department_id,
        manager_id: user.manager_id
      }
    });
  } catch (err) {
    console.error('❌ POST /auth/login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── POST: Reset password on first login ───────────────────
router.post('/reset-first-time-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required' });
    }

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, JWT_SECRET);
      if (decoded.action !== 'first_time_reset') {
        throw new Error('Invalid token type');
      }
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired reset token' });
    }

    // Password validation
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    }
    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one number' });
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one special character' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password and set invite_status to 'accepted'
    const { rows } = await db.query(`
      UPDATE employees
      SET 
        password_hash = $1,
        invite_status = 'accepted',
        updated_at = NOW()
      WHERE id = $2
      RETURNING id, name, email, role_id
    `, [passwordHash, decoded.userId]);

    if (!rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];

    // Get role name and department
    const { rows: roleRows } = await db.query(
      'SELECT r.name, e.department_id FROM roles r JOIN employees e ON e.role_id = r.id WHERE e.id = $1',
      [user.id]
    );
    const roleName = roleRows[0]?.name;
    const deptId = roleRows[0]?.department_id;

    // Generate regular login token (expiry based on session_timeout setting)
    const { rows: stRows2 } = await db.query('SELECT session_timeout FROM system_settings WHERE id = 1 LIMIT 1');
    const sessionMins2 = stRows2[0]?.session_timeout ?? 0;
    const expiresIn2 = sessionMins2 === 0 ? '365d' : `${sessionMins2}m`;

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: roleName, department_id: deptId },
      JWT_SECRET,
      { expiresIn: expiresIn2 }
    );

    console.log('✅ First-time password reset successful:', user.email);

    res.json({
      message: 'Password reset successful',
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: roleName,
        department_id: deptId
      }
    });
  } catch (err) {
    console.error('❌ POST /auth/reset-first-time-password error:', err);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// ── POST: Change password (for logged-in users) ───────────
router.post('/change-password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Get user
    const { rows } = await db.query(
      'SELECT id, password_hash FROM employees WHERE id = $1',
      [userId]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Validate new password
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    }
    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one number' });
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one special character' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.query(
      'UPDATE employees SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, userId]
    );

    console.log('✅ Password changed for user:', userId);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('❌ POST /auth/change-password error:', err);
    res.status(500).json({ error: 'Password change failed' });
  }
});

// ── GET: Verify token (for protected routes) ──────────────
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user details
    const { rows } = await db.query(`
      SELECT
        e.id, e.name, e.email, e.status, e.department_id, e.secondary_department_id, e.manager_id,
        r.name as role_name
      FROM employees e
      LEFT JOIN roles r ON e.role_id = r.id
      WHERE e.id = $1
    `, [decoded.userId]);

    if (!rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = rows[0];

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    res.json({
      valid: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role_name,
        department_id: user.department_id,
        secondary_department_id: user.secondary_department_id,
        manager_id: user.manager_id
      }
    });
  } catch (err) {
    console.error('❌ GET /auth/verify error:', err);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// ── POST: Logout (optional, mainly for frontend) ──────────
router.post('/logout', (req, res) => {
  // In JWT, logout is mainly handled on frontend by removing token
  res.json({ message: 'Logout successful' });
});

module.exports = router;