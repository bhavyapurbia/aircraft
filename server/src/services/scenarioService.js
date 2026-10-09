const { query } = require('../config/db');
const { validateActivity } = require('./conflictEngine');

/**
 * Runs a What-If Scenario simulation without modifying the primary schedule data.
 */
async function simulateScenario({
  scenario_name,
  scenario_type,
  description,
  params = {},
  user_id = null
}) {
  // Fetch current baseline activities and resources
  const resources = await query('SELECT * FROM resources WHERE is_archived = 0');
  const activities = await query(`
    SELECT a.*, GROUP_CONCAT(sa.staff_id) as staff_ids_csv
    FROM activities a
    LEFT JOIN staff_activities sa ON a.id = sa.activity_id
    WHERE a.status IN ('Scheduled', 'In Progress', 'Delayed')
    GROUP BY a.id
  `);
  const staff = await query('SELECT * FROM staff WHERE is_archived = 0');
  const maintenance = await query('SELECT * FROM maintenance_records WHERE status IN (\'Scheduled\', \'In Progress\')');

  // Baseline metrics
  const totalBaseActivities = activities.length;
  const baseActiveResources = resources.filter((r) => r.status === 'Available' || r.status === 'Scheduled').length;
  const baselineUtilisation = parseFloat(((baseActiveResources / resources.length) * 100).toFixed(1));

  // Clone datasets for virtual simulation
  let simResources = JSON.parse(JSON.stringify(resources));
  let simActivities = JSON.parse(JSON.stringify(activities));
  let simStaff = JSON.parse(JSON.stringify(staff));
  let simMaintenance = JSON.parse(JSON.stringify(maintenance));

  const simulationEvents = [];

  // Apply scenario parameter mutations to virtual clone
  if (scenario_type === 'Resource Grounded' && params.resource_id) {
    const resId = parseInt(params.resource_id, 10);
    const targetRes = simResources.find((r) => r.id === resId);
    if (targetRes) {
      targetRes.status = 'Unavailable';
      simulationEvents.push(`Aircraft "${targetRes.resource_name}" (${targetRes.registration_no}) virtually grounded due to: ${params.reason || 'Unscheduled technical hold'}.`);
    }
  } else if (scenario_type === 'Maintenance Extension' && params.maintenance_id) {
    const mId = parseInt(params.maintenance_id, 10);
    const m = simMaintenance.find((rec) => rec.id === mId);
    if (m) {
      const extHours = parseInt(params.extension_hours || '12', 10);
      const newCompletion = new Date(new Date(m.expected_completion).getTime() + extHours * 3600000);
      m.expected_completion = newCompletion.toISOString().slice(0, 19).replace('T', ' ');
      simulationEvents.push(`Maintenance record ${m.maintenance_code} extended by +${extHours} hours to ${m.expected_completion}.`);
    }
  } else if (scenario_type === 'Staff Sick / Unavailable' && params.staff_id) {
    const sId = parseInt(params.staff_id, 10);
    const member = simStaff.find((s) => s.id === sId);
    if (member) {
      member.status = 'Leave';
      simulationEvents.push(`Staff member "${member.full_name}" marked unavailable (Medical / Emergency leave).`);
    }
  } else if (scenario_type === 'Weather Grounding' && params.airfield) {
    const airfield = params.airfield;
    simulationEvents.push(`Weather warning at "${airfield}": All departures suspended for ${params.duration_hours || 6} hours.`);
  }

  // Evaluate new conflicts on virtual dataset
  const simulatedConflicts = [];
  let simulatedDelaysTotalHours = 0;

  for (const act of simActivities) {
    const assignedRes = simResources.find((r) => r.id === act.resource_id);

    // Check if assigned aircraft is now grounded
    if (assignedRes && (assignedRes.status === 'Unavailable' || assignedRes.status === 'Under Maintenance')) {
      simulatedConflicts.push({
        activity_id: act.id,
        activity_code: act.activity_code,
        title: act.title,
        conflict_type: 'UNAVAILABLE_RESOURCE',
        severity: 'Critical Error',
        details: `Assigned aircraft "${assignedRes.resource_name}" is simulated as ${assignedRes.status}. Sortie cannot launch as scheduled.`,
        suggested_action: 'Reallocate to available reserve aircraft or reschedule sortie window.'
      });
      simulatedDelaysTotalHours += (parseFloat(act.estimated_duration_hours) || 4);
    }

    // Check if assigned staff member is sick/unavailable
    if (params.staff_id) {
      const staffIds = act.staff_ids_csv ? act.staff_ids_csv.split(',').map((id) => parseInt(id, 10)) : [];
      if (staffIds.includes(parseInt(params.staff_id, 10))) {
        simulatedConflicts.push({
          activity_id: act.id,
          activity_code: act.activity_code,
          title: act.title,
          conflict_type: 'STAFF_DOUBLE_BOOKED',
          severity: 'Critical Error',
          details: `Designated crew member is incapacitated in this simulation.`,
          suggested_action: 'Roster standby flight crew certified for this sortie.'
        });
      }
    }
  }

  // Simulated metrics
  const simActiveResources = simResources.filter((r) => r.status === 'Available' || r.status === 'Scheduled').length;
  const simulatedUtilisation = parseFloat(((simActiveResources / simResources.length) * 100).toFixed(1));
  const utilisationDelta = parseFloat((simulatedUtilisation - baselineUtilisation).toFixed(1));

  const impactSummary = {
    simulation_events: simulationEvents,
    baseline_utilisation_pct: baselineUtilisation,
    simulated_utilisation_pct: simulatedUtilisation,
    utilisation_delta_pct: utilisationDelta,
    new_conflicts_count: simulatedConflicts.length,
    estimated_cascading_delay_hours: simulatedDelaysTotalHours,
    estimated_impact_cost: simulatedDelaysTotalHours * 1650,
    impact_level: simulatedConflicts.length > 2 ? 'High Operational Severity' : (simulatedConflicts.length > 0 ? 'Moderate Caution' : 'Minimal Disruption')
  };

  // Persist simulation record
  const result = await query(`
    INSERT INTO scenario_simulations 
    (scenario_name, scenario_type, description, baseline_snapshot, simulation_params, impact_summary, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    scenario_name || `Sim: ${scenario_type}`,
    scenario_type,
    description || 'What-if operational stress test simulation',
    JSON.stringify({ baselineActivities: totalBaseActivities, baselineUtilisation }),
    JSON.stringify(params),
    JSON.stringify(impactSummary),
    user_id
  ]);

  return {
    scenario_id: result.insertId,
    scenario_name,
    scenario_type,
    description,
    simulated_conflicts: simulatedConflicts,
    impact_summary: impactSummary,
    simulation_events: simulationEvents
  };
}

module.exports = { simulateScenario };
