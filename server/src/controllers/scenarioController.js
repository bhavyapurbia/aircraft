const { query } = require('../config/db');
const { simulateScenario } = require('../services/scenarioService');
const { logAudit } = require('../services/auditService');

async function listScenarios(req, res, next) {
  try {
    const list = await query(`
      SELECT s.*, u.full_name as author_name
      FROM scenario_simulations s
      LEFT JOIN users u ON s.created_by = u.id
      ORDER BY s.created_at DESC
    `);

    const parsed = list.map((item) => ({
      ...item,
      baseline_snapshot: typeof item.baseline_snapshot === 'string' ? JSON.parse(item.baseline_snapshot || '{}') : item.baseline_snapshot,
      simulation_params: typeof item.simulation_params === 'string' ? JSON.parse(item.simulation_params || '{}') : item.simulation_params,
      impact_summary: typeof item.impact_summary === 'string' ? JSON.parse(item.impact_summary || '{}') : item.impact_summary
    }));

    res.json({ success: true, data: parsed });
  } catch (error) {
    next(error);
  }
}

async function runSimulation(req, res, next) {
  try {
    const { scenario_name, scenario_type, description, params } = req.body;

    if (!scenario_type) {
      return res.status(400).json({ success: false, message: 'Scenario type is required.' });
    }

    const result = await simulateScenario({
      scenario_name,
      scenario_type,
      description,
      params,
      user_id: req.user ? req.user.id : null
    });

    await logAudit({
      userId: req.user ? req.user.id : null,
      username: req.user ? req.user.username : 'Planner',
      action: 'SCENARIO_SIMULATE',
      entityType: 'SCENARIO',
      entityId: result.scenario_id,
      outcome: 'SUCCESS',
      details: `Simulated ${scenario_type}: detected ${result.simulated_conflicts.length} virtual conflicts.`
    });

    res.json({
      success: true,
      message: 'What-If Scenario simulated successfully.',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

async function getScenarioById(req, res, next) {
  try {
    const { id } = req.params;
    const list = await query('SELECT * FROM scenario_simulations WHERE id = ?', [id]);
    if (!list.length) {
      return res.status(404).json({ success: false, message: 'Scenario simulation not found.' });
    }

    const item = list[0];
    res.json({
      success: true,
      data: {
        ...item,
        baseline_snapshot: typeof item.baseline_snapshot === 'string' ? JSON.parse(item.baseline_snapshot || '{}') : item.baseline_snapshot,
        simulation_params: typeof item.simulation_params === 'string' ? JSON.parse(item.simulation_params || '{}') : item.simulation_params,
        impact_summary: typeof item.impact_summary === 'string' ? JSON.parse(item.impact_summary || '{}') : item.impact_summary
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listScenarios,
  runSimulation,
  getScenarioById
};
