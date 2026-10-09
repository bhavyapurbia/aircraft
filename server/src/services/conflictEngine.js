const { query } = require('../config/db');

/**
 * Validates a single proposed activity against operational constraints.
 * 
 * @param {Object} activity - The activity object to validate
 * @param {number|null} excludeActivityId - ID to exclude if updating an existing record
 * @returns {Promise<Array>} List of detected conflict objects
 */
async function validateActivity(activity, excludeActivityId = null) {
  const conflicts = [];
  const {
    title,
    start_time,
    end_time,
    resource_id,
    staff_ids = [],
    required_qualification = null,
    estimated_duration_hours = null,
    passengers_count = 0,
    cargo_weight_kg = 0
  } = activity;

  // 1. Mandatory Fields Validation
  if (!start_time || !end_time || !resource_id) {
    conflicts.push({
      conflict_type: 'INVALID_PARAMETERS',
      severity: 'Critical Error',
      description: 'Missing mandatory fields: start time, end time, and resource must all be provided.',
      suggested_action: 'Complete all mandatory schedule form fields before submitting.'
    });
    return conflicts;
  }

  const start = new Date(start_time);
  const end = new Date(end_time);

  // 2. Invalid Duration Validation
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    conflicts.push({
      conflict_type: 'INVALID_DURATION',
      severity: 'Critical Error',
      description: `Activity end time (${end_time}) must be strictly after start time (${start_time}).`,
      suggested_action: 'Adjust start and end times to reflect a positive operational mission duration.'
    });
    return conflicts;
  }

  const durationHours = (end - start) / (1000 * 60 * 60);
  if (durationHours > 24) {
    conflicts.push({
      conflict_type: 'INVALID_DURATION',
      severity: 'Warning',
      description: `Single mission duration of ${durationHours.toFixed(1)} hours exceeds recommended single-sortie envelope.`,
      suggested_action: 'Split mission into intermediate legs or verify continuous flight authorisation.'
    });
  }

  // 3. Resource Availability & Status Check
  const resources = await query('SELECT * FROM resources WHERE id = ?', [resource_id]);
  if (!resources.length) {
    conflicts.push({
      conflict_type: 'UNAVAILABLE_RESOURCE',
      severity: 'Critical Error',
      description: `Resource ID ${resource_id} does not exist in the fleet registry.`,
      suggested_action: 'Select a valid active resource.'
    });
    return conflicts;
  }

  const resource = resources[0];
  if (resource.is_archived || resource.status === 'Archived') {
    conflicts.push({
      conflict_type: 'UNAVAILABLE_RESOURCE',
      severity: 'Critical Error',
      affected_resource: resource.resource_name,
      description: `Resource "${resource.resource_name}" (${resource.registration_no}) is archived and retired from service.`,
      suggested_action: 'Select an active resource from the fleet registry.'
    });
  } else if (resource.status === 'Unavailable') {
    conflicts.push({
      conflict_type: 'UNAVAILABLE_RESOURCE',
      severity: 'Critical Error',
      affected_resource: resource.resource_name,
      description: `Resource "${resource.resource_name}" is currently grounded / unavailable (${resource.notes || 'Awaiting clearance'}).`,
      suggested_action: 'Assign an alternate available aircraft or resolve grounding notice.'
    });
  }

  // 4. Resource Capacity Checks
  if (passengers_count && resource.capacity_pax && passengers_count > resource.capacity_pax) {
    conflicts.push({
      conflict_type: 'RESOURCE_CAPACITY_EXCEEDED',
      severity: 'Critical Error',
      affected_resource: resource.resource_name,
      description: `Passenger manifest (${passengers_count}) exceeds aircraft seating capacity (${resource.capacity_pax}).`,
      suggested_action: `Reassign to a larger aircraft such as ${resource.resource_name} or reduce payload.`
    });
  }
  if (cargo_weight_kg && resource.payload_capacity_kg && cargo_weight_kg > resource.payload_capacity_kg) {
    conflicts.push({
      conflict_type: 'RESOURCE_CAPACITY_EXCEEDED',
      severity: 'Critical Error',
      affected_resource: resource.resource_name,
      description: `Cargo weight (${cargo_weight_kg} kg) exceeds maximum payload rating (${resource.payload_capacity_kg} kg).`,
      suggested_action: 'Reallocate cargo across multiple sorties or select heavy lifter.'
    });
  }

  // 5. Overlapping Activities on Same Resource (with turnaround buffer)
  // Check for time overlap: NOT (existing.end <= new.start OR existing.start >= new.end)
  let overlapSql = `
    SELECT id, activity_code, title, start_time, end_time
    FROM activities
    WHERE resource_id = ?
      AND status NOT IN ('Cancelled', 'Completed')
      AND (start_time < ? AND end_time > ?)
  `;
  const overlapParams = [resource_id, end_time, start_time];
  if (excludeActivityId) {
    overlapSql += ' AND id != ?';
    overlapParams.push(excludeActivityId);
  }

  const overlappingActivities = await query(overlapSql, overlapParams);
  for (const act of overlappingActivities) {
    conflicts.push({
      conflict_type: 'RESOURCE_OVERLAP',
      severity: 'Critical Error',
      affected_resource: resource.resource_name,
      conflicting_activity_id: act.id,
      conflicting_activity_code: act.activity_code,
      relevant_times: { start: act.start_time, end: act.end_time },
      description: `Resource "${resource.resource_name}" is already committed to activity "${act.title}" (${act.activity_code}) from ${act.start_time} to ${act.end_time}.`,
      suggested_action: `Reschedule departure to after ${act.end_time} or allocate an alternate aircraft.`
    });
  }

  // 6. Mandatory Maintenance Collision
  const maintenanceSql = `
    SELECT id, maintenance_code, maintenance_type, start_time, expected_completion, status
    FROM maintenance_records
    WHERE resource_id = ?
      AND status IN ('Scheduled', 'In Progress', 'Overdue')
      AND (start_time < ? AND expected_completion > ?)
  `;
  const collidingMaint = await query(maintenanceSql, [resource_id, end_time, start_time]);
  for (const m of collidingMaint) {
    conflicts.push({
      conflict_type: 'MAINTENANCE_COLLISION',
      severity: 'Constraint Breach',
      affected_resource: resource.resource_name,
      conflicting_maintenance_id: m.id,
      conflicting_maintenance_code: m.maintenance_code,
      relevant_times: { start: m.start_time, end: m.expected_completion },
      description: `Resource "${resource.resource_name}" is locked in mandatory maintenance ${m.maintenance_code} (${m.maintenance_type}) until ${m.expected_completion}.`,
      suggested_action: `Shift departure until after maintenance release window (${m.expected_completion}) or deploy standby aircraft.`
    });
  }

  // 7. Staff Checks (Double-booking, Max Hours, Qualifications)
  if (Array.isArray(staff_ids) && staff_ids.length > 0) {
    for (const sId of staff_ids) {
      const staffRows = await query('SELECT * FROM staff WHERE id = ?', [sId]);
      if (!staffRows.length) continue;
      const staffMember = staffRows[0];

      if (staffMember.is_archived || staffMember.status === 'Archived') {
        conflicts.push({
          conflict_type: 'STAFF_DOUBLE_BOOKED',
          severity: 'Critical Error',
          conflicting_staff_id: staffMember.id,
          affected_staff: staffMember.full_name,
          description: `Staff member "${staffMember.full_name}" is archived/inactive.`,
          suggested_action: 'Assign an active certified crew member.'
        });
        continue;
      }

      // Check staff double booking
      let staffOverlapSql = `
        SELECT a.id, a.activity_code, a.title, a.start_time, a.end_time
        FROM activities a
        JOIN staff_activities sa ON a.id = sa.activity_id
        WHERE sa.staff_id = ?
          AND a.status NOT IN ('Cancelled', 'Completed')
          AND (a.start_time < ? AND a.end_time > ?)
      `;
      const staffOverlapParams = [sId, end_time, start_time];
      if (excludeActivityId) {
        staffOverlapSql += ' AND a.id != ?';
        staffOverlapParams.push(excludeActivityId);
      }

      const staffOverlaps = await query(staffOverlapSql, staffOverlapParams);
      for (const so of staffOverlaps) {
        conflicts.push({
          conflict_type: 'STAFF_DOUBLE_BOOKED',
          severity: 'Critical Error',
          conflicting_staff_id: staffMember.id,
          affected_staff: staffMember.full_name,
          conflicting_activity_id: so.id,
          conflicting_activity_code: so.activity_code,
          relevant_times: { start: so.start_time, end: so.end_time },
          description: `Staff member "${staffMember.full_name}" is already assigned to "${so.title}" (${so.activity_code}) from ${so.start_time} to ${so.end_time}.`,
          suggested_action: `Reassign crew assignment to another available pilot/technician or adjust mission schedule.`
        });
      }

      // Check daily duty hours
      const currentHours = parseFloat(staffMember.current_duty_hours) || 0;
      const dailyHours = currentHours + (parseFloat(durationHours) || 0);
      const maxHours = parseFloat(staffMember.max_daily_duty_hours) || 10;
      if (dailyHours > maxHours) {
        conflicts.push({
          conflict_type: 'STAFF_HOURS_VIOLATION',
          severity: 'Constraint Breach',
          conflicting_staff_id: staffMember.id,
          affected_staff: staffMember.full_name,
          description: `Assignment causes "${staffMember.full_name}" to exceed maximum regulatory duty limit (${dailyHours.toFixed(1)}h / ${maxHours}h max).`,
          suggested_action: 'Provide mandatory crew rest rotation or assign fresh crew.'
        });
      }

      // Check required qualification
      const checkQual = required_qualification || activity.required_qualification;
      if (checkQual) {
        const quals = await query(
          `SELECT qualification_name, expiry_date, status
           FROM qualifications
           WHERE staff_id = ? AND qualification_name = ?`,
          [sId, checkQual]
        );

        if (!quals.length) {
          conflicts.push({
            conflict_type: 'EXPIRED_QUALIFICATION',
            severity: 'Constraint Breach',
            conflicting_staff_id: staffMember.id,
            affected_staff: staffMember.full_name,
            description: `Staff member "${staffMember.full_name}" does not possess required qualification "${checkQual}".`,
            suggested_action: `Assign qualified crew certified in "${checkQual}".`
          });
        } else {
          const qual = quals[0];
          const expiryDate = new Date(qual.expiry_date);
          const missionDate = new Date(start_time);
          if (expiryDate < missionDate || qual.status === 'Expired') {
            conflicts.push({
              conflict_type: 'EXPIRED_QUALIFICATION',
              severity: 'Constraint Breach',
              conflicting_staff_id: staffMember.id,
              affected_staff: staffMember.full_name,
              description: `Qualification "${qual.qualification_name}" for "${staffMember.full_name}" expired on ${qual.expiry_date}.`,
              suggested_action: 'Renew certification before flight assignment or replace with current crew.'
            });
          }
        }
      }
    }
  }

  return conflicts;
}

/**
 * Scan all active activities in the database and synchronize conflicts in schedule_conflicts.
 */
async function scanAndSyncAllConflicts() {
  const activities = await query(`
    SELECT a.*, GROUP_CONCAT(sa.staff_id) as staff_id_list
    FROM activities a
    LEFT JOIN staff_activities sa ON a.id = sa.activity_id
    WHERE a.status NOT IN ('Cancelled', 'Completed')
    GROUP BY a.id
  `);

  const results = [];
  for (const act of activities) {
    const staffIds = act.staff_id_list 
      ? act.staff_id_list.split(',').map((id) => parseInt(id, 10)) 
      : [];

    const detected = await validateActivity({
      ...act,
      staff_ids: staffIds
    }, act.id);

    // Synchronize to schedule_conflicts table
    // Delete existing conflicts for this activity
    await query('DELETE FROM schedule_conflicts WHERE activity_id = ?', [act.id]);

    for (const c of detected) {
      await query(`
        INSERT INTO schedule_conflicts 
        (activity_id, conflict_type, severity, conflicting_activity_id, conflicting_maintenance_id, conflicting_staff_id, description, suggested_action, is_resolved, detected_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())
      `, [
        act.id,
        c.conflict_type,
        c.severity,
        c.conflicting_activity_id || null,
        c.conflicting_maintenance_id || null,
        c.conflicting_staff_id || null,
        c.description,
        c.suggested_action
      ]);
      results.push({ activity_id: act.id, ...c });
    }
  }

  return results;
}

module.exports = {
  validateActivity,
  scanAndSyncAllConflicts
};
