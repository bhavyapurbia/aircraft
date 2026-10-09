const express = require('express');
const router = express.Router();
const { getSummary, getAnalytics } = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

router.get('/summary', authenticate, getSummary);
router.get('/analytics', authenticate, getAnalytics);

module.exports = router;
