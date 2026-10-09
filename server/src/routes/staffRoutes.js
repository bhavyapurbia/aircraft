const express = require('express');
const router = express.Router();
const {
  listStaff,
  getStaffById,
  createStaff,
  updateStaff,
  archiveStaff
} = require('../controllers/staffController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', authenticate, listStaff);
router.get('/:id', authenticate, getStaffById);

router.post('/', authenticate, authorize(['Administrator']), createStaff);
router.put('/:id', authenticate, authorize(['Administrator', 'Planner']), updateStaff);
router.delete('/:id', authenticate, authorize(['Administrator']), archiveStaff);

module.exports = router;
