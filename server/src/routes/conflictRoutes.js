const express = require('express');
const router = express.Router();
const { listConflicts, triggerScan, resolveConflict } = require('../controllers/conflictController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', authenticate, listConflicts);
router.post('/scan', authenticate, authorize(['Administrator', 'Planner']), triggerScan);
router.patch('/:id/resolve', authenticate, authorize(['Administrator', 'Planner']), resolveConflict);

module.exports = router;
