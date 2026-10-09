const { query } = require('../config/db');
const { runOptimisation } = require('../services/optimisationEngine');
const { logAudit } = require('../services/auditService');

async function executeRun(req, res, next) {
  try {
    const { weights } = req.body;
    const result = await runOptimisation({
      initiated_by: req.user ? req.user.id : 2,
      weights
    });

    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'OPTIMISATION_RUN',
      entityType: 'OPTIMISATION',
      entityId: result.run_id,
      outcome: 'SUCCESS',
      details: `Optimisation run ${result.run_code}: avoided ${result.conflicts_avoided} conflicts in ${result.execution_time_ms}ms`
    });

    res.json({
      success: true,
      message: 'Heuristic optimisation analysis completed.',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

async function listRuns(req, res, next) {
  try {
    const runs = await query(`
      SELECT o.*, u.full_name as initiator_name
      FROM optimisation_runs o
      LEFT JOIN users u ON o.initiated_by = u.id
      ORDER BY o.created_at DESC
    `);

    res.json({ success: true, data: runs });
  } catch (error) {
    next(error);
  }
}

async function getRunById(req, res, next) {
  try {
    const { id } = req.params;
    const runs = await query(`
      SELECT o.*, u.full_name as initiator_name
      FROM optimisation_runs o
      LEFT JOIN users u ON o.initiated_by = u.id
      WHERE o.id = ?
    `, [id]);

    if (!runs.length) {
      return res.status(404).json({ success: false, message: 'Optimisation run not found.' });
    }

    const run = runs[0];
    const results = await query(`
      SELECT r.*, a.activity_code, a.title, res_orig.resource_name as orig_res_name, res_prop.resource_name as prop_res_name
      FROM optimisation_results r
      JOIN activities a ON r.activity_id = a.id
      JOIN resources res_orig ON r.original_resource_id = res_orig.id
      JOIN resources res_prop ON r.proposed_resource_id = res_prop.id
      WHERE r.optimisation_run_id = ?
    `, [id]);

    res.json({
      success: true,
      data: {
        ...run,
        proposed_changes: results
      }
    });
  } catch (error) {
    next(error);
  }
}

async function applyRunRecommendations(req, res, next) {
  try {
    const { id } = req.params;
    const changes = await query('SELECT * FROM optimisation_results WHERE optimisation_run_id = ?', [id]);

    if (!changes.length) {
      return res.status(400).json({ success: false, message: 'No changes found for this optimisation run.' });
    }

    for (const ch of changes) {
      await query(`
        UPDATE activities 
        SET resource_id = ?, start_time = ?, estimated_cost = ?
        WHERE id = ?
      `, [ch.proposed_resource_id, ch.proposed_start_time, ch.proposed_cost, ch.activity_id]);

      // Resolve previous conflicts for this activity
      await query('UPDATE schedule_conflicts SET is_resolved = 1, resolved_at = NOW() WHERE activity_id = ?', [ch.activity_id]);
    }

    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'OPTIMISATION_APPLY',
      entityType: 'OPTIMISATION',
      entityId: id,
      outcome: 'SUCCESS',
      details: `Committed ${changes.length} schedule optimisations to live roster.`
    });

    res.json({
      success: true,
      message: `Successfully applied ${changes.length} optimized schedule allocations into active operational schedule!`
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  executeRun,
  listRuns,
  getRunById,
  applyRunRecommendations
};
