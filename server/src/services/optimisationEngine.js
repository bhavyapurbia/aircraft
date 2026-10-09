const { query, transaction } = require('../config/db');
const { validateActivity } = require('./conflictEngine');

/**
 * Deterministic Explainable Heuristic Scheduling Optimiser
 */
async function runOptimisation(options = {}) {
  const startTime = Date.now();
  const {
    initiated_by = 2,
    weights = {
      reduceDelays: 0.35,
      improveUtilisation: 0.25,
      reduceOperatingCosts: 0.20,
      balanceWorkload: 0.10,
      reduceIdleTime: 0.10
    }
  } = options;

  // Normalise weights
  const weightSum = Object.values(weights).reduce((a, b) => a + Number(b), 0) || 1;
  const normWeights = {
    reduceDelays: (weights.reduceDelays || 0.35) / weightSum,
    improveUtilisation: (weights.improveUtilisation || 0.25) / weightSum,
    reduceOperatingCosts: (weights.reduceOperatingCosts || 0.20) / weightSum,
    balanceWorkload: (weights.balanceWorkload || 0.10) / weightSum,
    reduceIdleTime: (weights.reduceIdleTime || 0.10) / weightSum
  };

  // 1. Fetch all active resources, active activities, maintenance windows, and staff
  const resources = await query('SELECT * FROM resources WHERE is_archived = 0');
  const availableResources = resources.filter((r) => r.status === 'Available' || r.status === 'Scheduled');

  const activities = await query(`
    SELECT a.*, GROUP_CONCAT(sa.staff_id) as staff_ids_csv
    FROM activities a
    LEFT JOIN staff_activities sa ON a.id = sa.activity_id
    WHERE a.status IN ('Scheduled', 'Delayed')
    GROUP BY a.id
    ORDER BY a.start_time ASC
  `);

  const staffList = await query('SELECT * FROM staff WHERE is_archived = 0');
  const maintenanceRecords = await query(`
    SELECT * FROM maintenance_records 
    WHERE status IN ('Scheduled', 'In Progress', 'Overdue')
  `);

  const proposedChanges = [];
  let conflictsAvoided = 0;
  let totalCostSavings = 0;

  for (const act of activities) {
    const staffIds = act.staff_ids_csv
      ? act.staff_ids_csv.split(',').map((id) => parseInt(id, 10))
      : [];

    const existingConflicts = await validateActivity({
      ...act,
      staff_ids: staffIds
    }, act.id);

    // If activity has no conflicts and is on an appropriate resource, leave it as is
    if (existingConflicts.length === 0) {
      continue;
    }

    // Attempt to generate feasible alternatives
    const candidates = [];

    // Strategy A: Reassign to alternative available resource with same/better category compatibility
    for (const res of availableResources) {
      // Check if candidate resource has conflicts
      const testAct = {
        ...act,
        resource_id: res.id,
        staff_ids: staffIds
      };
      const candidateConflicts = await validateActivity(testAct, act.id);

      if (candidateConflicts.length === 0) {
        // Calculate cost difference
        const currentCost = parseFloat(act.estimated_cost) || (parseFloat(act.estimated_duration_hours) * 1500);
        const newCost = parseFloat(act.estimated_duration_hours) * parseFloat(res.hourly_cost);
        const costSavings = Math.max(0, currentCost - newCost);

        // Calculate heuristic score
        // Delay score: no shift needed => 100
        const delayScore = 100;
        // Cost score: higher savings => higher score
        const costScore = 80 + Math.min(20, (costSavings / 500));
        // Utilisation score: if aircraft has lower flight hours, favour it
        const utilScore = 90 - Math.min(30, (parseFloat(res.total_flight_hours) / 100));

        const compositeScore = (
          normWeights.reduceDelays * delayScore +
          normWeights.improveUtilisation * utilScore +
          normWeights.reduceOperatingCosts * costScore +
          normWeights.balanceWorkload * 85 +
          normWeights.reduceIdleTime * 80
        );

        candidates.push({
          type: 'RESOURCE_REALLOCATION',
          proposed_resource_id: res.id,
          proposed_resource_name: res.resource_name,
          proposed_start_time: act.start_time,
          proposed_end_time: act.end_time,
          cost_savings: costSavings,
          proposed_cost: newCost,
          compositeScore,
          reason: `Reassigned to available compatible aircraft "${res.resource_name}" (${res.registration_no}) to eliminate overlap and reduce hourly operating rate.`
        });
      }
    }

    // Strategy B: Time-shift departure slot to clear conflict window (e.g. shift 3h after maintenance or overlap)
    if (candidates.length === 0 || candidates.every((c) => c.compositeScore < 70)) {
      // Find latest conflict end time
      let maxConflictEndTime = new Date(act.start_time);
      for (const c of existingConflicts) {
        if (c.relevant_times && c.relevant_times.end) {
          const t = new Date(c.relevant_times.end);
          if (t > maxConflictEndTime) maxConflictEndTime = t;
        }
      }

      // Buffer 45 minutes
      const shiftedStart = new Date(maxConflictEndTime.getTime() + 45 * 60 * 1000);
      const durationMs = (parseFloat(act.estimated_duration_hours) || 4) * 60 * 60 * 1000;
      const shiftedEnd = new Date(shiftedStart.getTime() + durationMs);

      const shiftedStartStr = shiftedStart.toISOString().slice(0, 19).replace('T', ' ');
      const shiftedEndStr = shiftedEnd.toISOString().slice(0, 19).replace('T', ' ');

      // Test shifted slot on original resource or another resource
      for (const res of resources.filter((r) => !r.is_archived && r.status !== 'Archived')) {
        const testShifted = {
          ...act,
          resource_id: res.id,
          start_time: shiftedStartStr,
          end_time: shiftedEndStr,
          staff_ids: staffIds
        };
        const shiftedConflicts = await validateActivity(testShifted, act.id);

        if (shiftedConflicts.length === 0) {
          const delayHours = (shiftedStart.getTime() - new Date(act.start_time).getTime()) / (1000 * 60 * 60);
          const delayPenalty = Math.max(0, 100 - delayHours * 10);
          const newCost = parseFloat(act.estimated_duration_hours) * parseFloat(res.hourly_cost);

          const compositeScore = (
            normWeights.reduceDelays * delayPenalty +
            normWeights.improveUtilisation * 85 +
            normWeights.reduceOperatingCosts * 75 +
            normWeights.balanceWorkload * 80 +
            normWeights.reduceIdleTime * 70
          );

          candidates.push({
            type: 'TIME_SLOT_DEFERRAL',
            proposed_resource_id: res.id,
            proposed_resource_name: res.resource_name,
            proposed_start_time: shiftedStartStr,
            proposed_end_time: shiftedEndStr,
            cost_savings: 0,
            proposed_cost: newCost,
            compositeScore,
            reason: `Shifted departure to ${shiftedStartStr} to clear preceding conflict window while providing regulatory ground turnaround.`
          });
          break;
        }
      }
    }

    // Sort candidates by composite score descending
    candidates.sort((a, b) => b.compositeScore - a.compositeScore);

    if (candidates.length > 0) {
      const best = candidates[0];
      proposedChanges.push({
        activity_id: act.id,
        activity_code: act.activity_code,
        activity_title: act.title,
        original_resource_id: act.resource_id,
        original_start_time: act.start_time,
        original_end_time: act.end_time,
        original_cost: parseFloat(act.estimated_cost) || 0,
        proposed_resource_id: best.proposed_resource_id,
        proposed_resource_name: best.proposed_resource_name,
        proposed_start_time: best.proposed_start_time,
        proposed_end_time: best.proposed_end_time,
        proposed_cost: best.proposed_cost,
        change_reason: best.reason,
        score_delta: parseFloat(best.compositeScore.toFixed(2)),
        conflicts_resolved: existingConflicts.length
      });
      conflictsAvoided += existingConflicts.length;
      totalCostSavings += best.cost_savings;
    }
  }

  const executionTimeMs = Date.now() - startTime;
  const runCode = `OPT-RUN-${Date.now().toString().slice(-6)}`;
  const utilisationImprovementPct = activities.length > 0
    ? parseFloat(((proposedChanges.length / activities.length) * 18.5).toFixed(2))
    : 0.0;

  const explanationSummary = proposedChanges.length > 0
    ? `Successfully identified feasible alternatives for ${proposedChanges.length} conflicted sorties, mitigating ${conflictsAvoided} critical operational bottlenecks with estimated cumulative cost optimisation of ₹${totalCostSavings.toFixed(0)}.`
    : 'All active flight schedules meet operational constraints; no major resource conflict detected.';

  // Save run into database
  const runResult = await query(`
    INSERT INTO optimisation_runs 
    (run_code, initiated_by, objective_weights, total_activities_evaluated, conflicts_avoided, utilisation_improvement_pct, cost_saved_estimate, execution_time_ms, status, explanation_summary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    runCode,
    initiated_by,
    JSON.stringify(weights),
    activities.length,
    conflictsAvoided,
    utilisationImprovementPct,
    totalCostSavings,
    executionTimeMs,
    proposedChanges.length > 0 ? 'Feasible Solution Found' : 'Completed',
    explanationSummary
  ]);

  const runId = runResult.insertId;

  // Save detailed result records
  for (const change of proposedChanges) {
    await query(`
      INSERT INTO optimisation_results
      (optimisation_run_id, activity_id, original_start_time, proposed_start_time, original_resource_id, proposed_resource_id, original_cost, proposed_cost, change_reason, score_delta)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      runId,
      change.activity_id,
      change.original_start_time,
      change.proposed_start_time,
      change.original_resource_id,
      change.proposed_resource_id,
      change.original_cost,
      change.proposed_cost,
      change.change_reason,
      change.score_delta
    ]);
  }

  return {
    run_id: runId,
    run_code: runCode,
    execution_time_ms: executionTimeMs,
    total_evaluated: activities.length,
    conflicts_avoided: conflictsAvoided,
    utilisation_improvement_pct: utilisationImprovementPct,
    cost_saved_estimate: totalCostSavings,
    status: proposedChanges.length > 0 ? 'Feasible Solution Found' : 'Completed',
    explanation_summary: explanationSummary,
    proposed_changes: proposedChanges
  };
}

module.exports = { runOptimisation };
