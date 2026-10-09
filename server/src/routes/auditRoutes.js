const express = require('express');
const router = express.Router();
const { listAuditLogs } = require('../controllers/auditController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', authenticate, authorize(['Administrator']), listAuditLogs);

module.exports = router;
