const express = require('express');
const router = express.Router();
const { getSettings, updateSetting } = require('../controllers/settingsController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', authenticate, getSettings);
router.post('/', authenticate, authorize(['Administrator']), updateSetting);

module.exports = router;
