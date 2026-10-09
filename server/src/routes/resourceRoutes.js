const express = require('express');
const router = express.Router();
const {
  listResources,
  getResourceById,
  createResource,
  updateResource,
  updateStatus,
  archiveResource,
  exportResourcesCSV
} = require('../controllers/resourceController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', authenticate, listResources);
router.get('/export/csv', authenticate, exportResourcesCSV);
router.get('/:id', authenticate, getResourceById);

// Admin & Planner mutations
router.post('/', authenticate, authorize(['Administrator', 'Planner']), createResource);
router.put('/:id', authenticate, authorize(['Administrator', 'Planner']), updateResource);
router.patch('/:id/status', authenticate, authorize(['Administrator', 'Planner']), updateStatus);

// Admin only archiving
router.delete('/:id', authenticate, authorize(['Administrator']), archiveResource);

module.exports = router;
