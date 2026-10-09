const express = require('express');
const router = express.Router();
const {
  getUtilisationReport,
  getMaintenanceReport,
  getConflictsReport,
  getStaffWorkloadReport,
  exportReportCSV
} = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

router.get('/utilisation', authenticate, getUtilisationReport);
router.get('/maintenance', authenticate, getMaintenanceReport);
router.get('/conflicts', authenticate, getConflictsReport);
router.get('/staff-workload', authenticate, getStaffWorkloadReport);
router.get('/export/csv', authenticate, exportReportCSV);

module.exports = router;
