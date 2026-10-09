const express = require('express');
const router = express.Router();
const {
  executeRun,
  listRuns,
  getRunById,
  applyRunRecommendations
} = require('../controllers/optimisationController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/runs', authenticate, listRuns);
router.get('/runs/:id', authenticate, getRunById);
router.post('/run', authenticate, authorize(['Administrator', 'Planner']), executeRun);
router.post('/runs/:id/apply', authenticate, authorize(['Administrator', 'Planner']), applyRunRecommendations);

module.exports = router;
