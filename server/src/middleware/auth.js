const { verifyToken } = require('../utils/jwt');
const { query } = require('../config/db');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token missing or invalid format.'
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication session. Please sign in again.'
      });
    }

    const users = await query(
      `SELECT u.id, u.username, u.email, u.full_name, u.role_id, r.name AS role_name, u.department, u.is_active
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? LIMIT 1`,
      [decoded.id]
    );

    if (!users.length || !users[0].is_active) {
      return res.status(401).json({
        success: false,
        message: 'User account not found or deactivated.'
      });
    }

    req.user = users[0];
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { authenticate };
