const { query } = require('../config/db');

async function listNotifications(req, res, next) {
  try {
    const notifications = await query(`
      SELECT * FROM notifications
      WHERE user_id = ? OR user_id IS NULL
      ORDER BY created_at DESC
      LIMIT 50
    `, [req.user.id]);

    const [unreadCount] = await query(`
      SELECT COUNT(*) as count FROM notifications
      WHERE (user_id = ? OR user_id IS NULL) AND is_read = 0
    `, [req.user.id]);

    res.json({
      success: true,
      unread_count: unreadCount ? unreadCount.count : 0,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
}

async function markAsRead(req, res, next) {
  try {
    const { id } = req.params;
    if (id === 'all') {
      await query('UPDATE notifications SET is_read = 1 WHERE user_id = ? OR user_id IS NULL', [req.user.id]);
    } else {
      await query('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
    }
    res.json({ success: true, message: 'Notification(s) updated.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listNotifications,
  markAsRead
};
