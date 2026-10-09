const express = require('express');
const router = express.Router();
const {
  listMaintenance,
  getUpcomingMaintenance,
  getOverdueMaintenance,
  createMaintenance,
  updateMaintenance
} = require('../controllers/maintenanceController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', authenticate, listMaintenance);
router.get('/upcoming', authenticate, getUpcomingMaintenance);
router.get('/overdue', authenticate, getOverdueMaintenance);

router.post('/', authenticate, authorize(['Administrator', 'Planner']), createMaintenance);
router.put('/:id', authenticate, authorize(['Administrator', 'Planner']), updateMaintenance);

module.exports = router;
