const { query } = require('../config/db');

async function createNotification({
  userId = null,
  type,
  title,
  message,
  severity = 'Info',
  relatedEntityType = null,
  relatedEntityId = null
}) {
  try {
    const result = await query(
      `INSERT INTO notifications (user_id, type, title, message, severity, related_entity_type, related_entity_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, type, title, message, severity, relatedEntityType, relatedEntityId]
    );
    return result.insertId;
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
}

module.exports = { createNotification };
