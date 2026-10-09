const { query } = require('../config/db');

async function logAudit({
  userId = null,
  username = 'System',
  action,
  entityType,
  entityId = null,
  outcome = 'SUCCESS',
  ipAddress = '127.0.0.1',
  details = null
}) {
  try {
    const detailsStr = typeof details === 'object' && details !== null 
      ? JSON.stringify(details) 
      : (details || null);

    await query(
      `INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, outcome, ip_address, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, username, action, entityType, String(entityId || ''), outcome, ipAddress, detailsStr]
    );
  } catch (err) {
    // Audit logging should not crash the main application if something fails
    console.error('Failed to write audit log:', err.message);
  }
}

module.exports = { logAudit };
