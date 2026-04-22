const jwt = require('jsonwebtoken');
const db   = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Always fetches the current role from DB so stale JWTs (issued before a
// role was assigned or after a role change) are automatically corrected.
async function verify(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { rows } = await db.query(
      `SELECT r.name AS role_name
       FROM employees e
       LEFT JOIN roles r ON r.id = e.role_id
       WHERE e.id = $1 AND e.status = 'active'`,
      [decoded.userId]
    );
    if (!rows[0]) return res.status(401).json({ error: 'User not found or inactive' });
    req.user = { ...decoded, role: rows[0].role_name };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

module.exports = { verify, requireRole };
