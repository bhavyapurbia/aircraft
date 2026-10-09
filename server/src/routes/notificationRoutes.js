const express = require('express');
const router = express.Router();
const { listNotifications, markAsRead } = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, listNotifications);
router.patch('/:id/read', authenticate, markAsRead);

module.exports = router;
