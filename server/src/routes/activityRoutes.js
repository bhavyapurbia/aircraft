const express = require('express');
const router = express.Router();
const {
  listActivities,
  getActivityById,
  validateActivityProposal,
  createActivity,
  updateActivity,
  deleteActivity
} = require('../controllers/activityController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', authenticate, listActivities);
router.post('/validate', authenticate, validateActivityProposal);
router.get('/:id', authenticate, getActivityById);

router.post('/', authenticate, authorize(['Administrator', 'Planner']), createActivity);
router.put('/:id', authenticate, authorize(['Administrator', 'Planner']), updateActivity);
router.delete('/:id', authenticate, authorize(['Administrator', 'Planner']), deleteActivity);

module.exports = router;
