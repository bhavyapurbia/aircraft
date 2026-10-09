const test = require('node:test');
const assert = require('node:assert');
const { runOptimisation } = require('../src/services/optimisationEngine');
const { simulateScenario } = require('../src/services/scenarioService');
const { query, pool } = require('../src/config/db');

test.after(async () => {
  await pool.end();
});

test('Optimisation Engine: generates feasible alternatives and avoids hard conflicts', async () => {
  const result = await runOptimisation({
    initiated_by: 1,
    weights: {
      reduceDelays: 0.4,
      improveUtilisation: 0.3,
      reduceOperatingCosts: 0.1,
      balanceWorkload: 0.1,
      reduceIdleTime: 0.1
    }
  });

  assert.ok(result.run_id, 'Should create run record');
  assert.ok(result.conflicts_avoided >= 0, 'Should calculate conflicts avoided');
  assert.ok(result.execution_time_ms >= 0, 'Should measure execution time');
  assert.strictEqual(result.status, 'Feasible Solution Found');
  assert.ok(result.proposed_changes.length > 0, 'Should propose changes for conflicting sorties');
});

test('Scenario Simulation: does not alter primary baseline data (isolation)', async () => {
  // Count baseline activities before simulation
  const [beforeCount] = await query('SELECT COUNT(*) as cnt FROM activities');

  const simResult = await simulateScenario({
    scenario_name: 'Simulated Fog at Alpha Hub',
    scenario_type: 'Weather Grounding',
    description: 'Runway maintenance hold',
    params: { airfield: 'Airfield Alpha', duration_hours: 8 }
  });

  // Verify baseline activities unchanged
  const [afterCount] = await query('SELECT COUNT(*) as cnt FROM activities');
  assert.strictEqual(beforeCount.cnt, afterCount.cnt, 'Baseline activities must not be mutated');
  assert.ok(simResult.scenario_id, 'Should persist scenario record');
  assert.ok(simResult.impact_summary, 'Should return calculated impact summary');
});
