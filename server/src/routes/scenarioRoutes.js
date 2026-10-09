const express = require('express');
const router = express.Router();
const { listScenarios, runSimulation, getScenarioById } = require('../controllers/scenarioController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', authenticate, listScenarios);
router.get('/:id', authenticate, getScenarioById);
router.post('/simulate', authenticate, authorize(['Administrator', 'Planner']), runSimulation);

module.exports = router;
