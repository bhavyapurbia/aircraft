const { query, transaction } = require('../config/db');
const { validateActivity, scanAndSyncAllConflicts } = require('../services/conflictEngine');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');

async function listActivities(req, res, next) {
  try {
    const {
      status,
      resource_id,
      staff_id,
      category,
      start_date,
      end_date,
      search
    } = req.query;

    let sql = `
      SELECT 
        a.*,
        r.resource_name,
        r.registration_no,
        r.category as resource_category,
        GROUP_CONCAT(s.id) as staff_ids,
        GROUP_CONCAT(s.full_name SEPARATOR ', ') as staff_names
      FROM activities a
      LEFT JOIN resources r ON a.resource_id = r.id
      LEFT JOIN staff_activities sa ON a.id = sa.activity_id
      LEFT JOIN staff s ON sa.staff_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND a.status = ?';
      params.push(status);
    }
    if (resource_id) {
      sql += ' AND a.resource_id = ?';
      params.push(resource_id);
    }
    if (category) {
      sql += ' AND a.category = ?';
      params.push(category);
    }
    if (start_date) {
      sql += ' AND a.start_time >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND a.end_time <= ?';
      params.push(end_date);
    }
    if (search) {
      sql += ' AND (a.title LIKE ? OR a.activity_code LIKE ? OR a.origin LIKE ? OR a.destination LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    sql += ' GROUP BY a.id ORDER BY a.start_time ASC';

    let activities = await query(sql, params);

    if (staff_id) {
      const filterStaffId = String(staff_id);
      activities = activities.filter((act) => {
        if (!act.staff_ids) return false;
        return act.staff_ids.split(',').includes(filterStaffId);
      });
    }

    // Attach unresolved conflicts count for each activity
    const conflicts = await query('SELECT activity_id, COUNT(*) as count FROM schedule_conflicts WHERE is_resolved = 0 GROUP BY activity_id');
    const conflictMap = {};
    conflicts.forEach((c) => { conflictMap[c.activity_id] = c.count; });

    const enriched = activities.map((act) => ({
      ...act,
      unresolved_conflicts_count: conflictMap[act.id] || 0
    }));

    res.json({
      success: true,
      data: enriched
    });
  } catch (error) {
    next(error);
  }
}

async function getActivityById(req, res, next) {
  try {
    const { id } = req.params;
    const activities = await query(`
      SELECT a.*, r.resource_name, r.registration_no, r.model, r.hourly_cost
      FROM activities a
      JOIN resources r ON a.resource_id = r.id
      WHERE a.id = ?
    `, [id]);

    if (!activities.length) {
      return res.status(404).json({ success: false, message: 'Activity not found.' });
    }

    const activity = activities[0];

    // Assigned staff
    const staffMembers = await query(`
      SELECT s.id, s.staff_code, s.full_name, s.role_category, sa.role_in_activity
      FROM staff_activities sa
      JOIN staff s ON sa.staff_id = s.id
      WHERE sa.activity_id = ?
    `, [id]);

    // Active conflicts
    const conflicts = await query(`
      SELECT * FROM schedule_conflicts
      WHERE activity_id = ? AND is_resolved = 0
    `, [id]);

    res.json({
      success: true,
      data: {
        ...activity,
        assigned_staff: staffMembers,
        conflicts
      }
    });
  } catch (error) {
    next(error);
  }
}

async function validateActivityProposal(req, res, next) {
  try {
    const activityData = req.body;
    const excludeId = req.query.excludeId ? parseInt(req.query.excludeId, 10) : null;
    const conflicts = await validateActivity(activityData, excludeId);

    res.json({
      success: true,
      is_valid: conflicts.length === 0,
      conflicts_count: conflicts.length,
      conflicts
    });
  } catch (error) {
    next(error);
  }
}

async function createActivity(req, res, next) {
  try {
    const {
      title,
      category,
      priority = 'Routine',
      start_time,
      end_time,
      resource_id,
      origin = 'Airfield Alpha',
      destination = 'Airfield Bravo',
      estimated_duration_hours,
      estimated_cost,
      required_qualification,
      notes = '',
      staff_ids = [],
      force_save = false
    } = req.body;

    if (!title || !category || !start_time || !end_time || !resource_id) {
      return res.status(400).json({
        success: false,
        message: 'Title, category, start time, end time, and resource are mandatory.'
      });
    }

    // Run backend conflict validation
    const conflicts = await validateActivity({
      title,
      start_time,
      end_time,
      resource_id,
      staff_ids,
      required_qualification,
      estimated_duration_hours
    });

    // If hard constraints violated and not forced:
    const hardBreaches = conflicts.filter((c) => c.severity === 'Constraint Breach' || c.severity === 'Critical Error');
    if (hardBreaches.length > 0 && !force_save) {
      return res.status(409).json({
        success: false,
        message: 'Operational conflicts detected. Rectify conflicts or resolve constraint breach.',
        conflicts
      });
    }

    // Calculate duration and cost if not provided
    const start = new Date(start_time);
    const end = new Date(end_time);
    const calcDuration = estimated_duration_hours || ((end - start) / (1000 * 60 * 60)).toFixed(2);

    // Fetch resource hourly cost for estimated cost
    const [resRow] = await query('SELECT hourly_cost FROM resources WHERE id = ?', [resource_id]);
    const hourlyCost = resRow ? parseFloat(resRow.hourly_cost) : 1200;
    const calcCost = estimated_cost || (parseFloat(calcDuration) * hourlyCost).toFixed(2);

    const activity_code = `ACT-SORTIE-${Date.now().toString().slice(-5)}`;

    const insertResult = await query(`
      INSERT INTO activities
      (activity_code, title, category, priority, start_time, end_time, resource_id, status, origin, destination, estimated_duration_hours, estimated_cost, required_qualification, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Scheduled', ?, ?, ?, ?, ?, ?, ?)
    `, [
      activity_code,
      title,
      category,
      priority,
      start_time,
      end_time,
      resource_id,
      origin,
      destination,
      calcDuration,
      calcCost,
      required_qualification || null,
      notes,
      req.user.id
    ]);

    const newActivityId = insertResult.insertId;

    // Insert staff assignments
    if (Array.isArray(staff_ids)) {
      for (const sId of staff_ids) {
        await query(
          'INSERT INTO staff_activities (activity_id, staff_id, role_in_activity) VALUES (?, ?, ?)',
          [newActivityId, sId, 'Assigned Crew']
        );
      }
    }

    // Record conflicts in schedule_conflicts table if any
    for (const c of conflicts) {
      await query(`
        INSERT INTO schedule_conflicts
        (activity_id, conflict_type, severity, conflicting_activity_id, conflicting_maintenance_id, conflicting_staff_id, description, suggested_action, is_resolved)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
      `, [
        newActivityId,
        c.conflict_type,
        c.severity,
        c.conflicting_activity_id || null,
        c.conflicting_maintenance_id || null,
        c.conflicting_staff_id || null,
        c.description,
        c.suggested_action
      ]);

      await createNotification({
        userId: req.user.id,
        type: 'CONFLICT_ALERT',
        title: `Conflict in ${activity_code}`,
        message: c.description,
        severity: c.severity === 'Constraint Breach' ? 'Urgent' : 'Warning',
        relatedEntityType: 'activity',
        relatedEntityId: newActivityId
      });
    }

    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'ACTIVITY_CREATE',
      entityType: 'ACTIVITY',
      entityId: newActivityId,
      outcome: 'SUCCESS',
      details: `Scheduled sortie ${activity_code}: ${title} (${conflicts.length} warnings)`
    });

    res.status(201).json({
      success: true,
      message: 'Sortie scheduled successfully.',
      activity_id: newActivityId,
      activity_code,
      conflicts_detected: conflicts
    });
  } catch (error) {
    next(error);
  }
}

async function updateActivity(req, res, next) {
  try {
    const { id } = req.params;
    const {
      title,
      category,
      priority,
      start_time,
      end_time,
      resource_id,
      status,
      origin,
      destination,
      estimated_duration_hours,
      estimated_cost,
      required_qualification,
      notes,
      staff_ids = []
    } = req.body;

    const existing = await query('SELECT * FROM activities WHERE id = ?', [id]);
    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Activity not found.' });
    }

    await query(`
      UPDATE activities SET
        title = ?,
        category = ?,
        priority = ?,
        start_time = ?,
        end_time = ?,
        resource_id = ?,
        status = ?,
        origin = ?,
        destination = ?,
        estimated_duration_hours = ?,
        estimated_cost = ?,
        required_qualification = ?,
        notes = ?
      WHERE id = ?
    `, [
      title,
      category,
      priority,
      start_time,
      end_time,
      resource_id,
      status || existing[0].status,
      origin,
      destination,
      estimated_duration_hours,
      estimated_cost,
      required_qualification || null,
      notes,
      id
    ]);

    // Update staff assignments
    if (Array.isArray(staff_ids)) {
      await query('DELETE FROM staff_activities WHERE activity_id = ?', [id]);
      for (const sId of staff_ids) {
        await query(
          'INSERT INTO staff_activities (activity_id, staff_id, role_in_activity) VALUES (?, ?, ?)',
          [id, sId, 'Assigned Crew']
        );
      }
    }

    // Rescan conflicts for this activity
    const conflicts = await validateActivity({
      title,
      start_time,
      end_time,
      resource_id,
      staff_ids,
      required_qualification,
      estimated_duration_hours
    }, id);

    await query('DELETE FROM schedule_conflicts WHERE activity_id = ?', [id]);
    for (const c of conflicts) {
      await query(`
        INSERT INTO schedule_conflicts
        (activity_id, conflict_type, severity, conflicting_activity_id, conflicting_maintenance_id, conflicting_staff_id, description, suggested_action, is_resolved)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
      `, [
        id,
        c.conflict_type,
        c.severity,
        c.conflicting_activity_id || null,
        c.conflicting_maintenance_id || null,
        c.conflicting_staff_id || null,
        c.description,
        c.suggested_action
      ]);
    }

    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'ACTIVITY_UPDATE',
      entityType: 'ACTIVITY',
      entityId: id,
      outcome: 'SUCCESS',
      details: `Updated parameters for activity ${id}`
    });

    res.json({
      success: true,
      message: 'Activity updated successfully.',
      conflicts_count: conflicts.length
    });
  } catch (error) {
    next(error);
  }
}

async function deleteActivity(req, res, next) {
  try {
    const { id } = req.params;
    await query('DELETE FROM activities WHERE id = ?', [id]);

    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'ACTIVITY_DELETE',
      entityType: 'ACTIVITY',
      entityId: id,
      outcome: 'SUCCESS',
      details: 'Activity removed from schedule'
    });

    res.json({ success: true, message: 'Activity deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listActivities,
  getActivityById,
  validateActivityProposal,
  createActivity,
  updateActivity,
  deleteActivity
};
