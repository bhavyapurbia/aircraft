const { query } = require('../config/db');
const { scanAndSyncAllConflicts } = require('../services/conflictEngine');
const { logAudit } = require('../services/auditService');

async function listConflicts(req, res, next) {
  try {
    const { is_resolved = '0', severity } = req.query;

    let sql = `
      SELECT 
        c.*,
        a.activity_code,
        a.title as activity_title,
        a.start_time,
        a.end_time,
        r.resource_name,
        r.registration_no,
        ca.activity_code as conflicting_activity_code,
        ca.title as conflicting_activity_title,
        cm.maintenance_code as conflicting_maintenance_code,
        cm.maintenance_type as conflicting_maintenance_type,
        cs.full_name as conflicting_staff_name
      FROM schedule_conflicts c
      JOIN activities a ON c.activity_id = a.id
      JOIN resources r ON a.resource_id = r.id
      LEFT JOIN activities ca ON c.conflicting_activity_id = ca.id
      LEFT JOIN maintenance_records cm ON c.conflicting_maintenance_id = cm.id
      LEFT JOIN staff cs ON c.conflicting_staff_id = cs.id
      WHERE 1=1
    `;
    const params = [];

    if (is_resolved !== 'all') {
      sql += ' AND c.is_resolved = ?';
      params.push(is_resolved === '1' ? 1 : 0);
    }
    if (severity) {
      sql += ' AND c.severity = ?';
      params.push(severity);
    }

    sql += ' ORDER BY c.detected_at DESC';
    const conflicts = await query(sql, params);

    res.json({
      success: true,
      data: conflicts
    });
  } catch (error) {
    next(error);
  }
}

async function triggerScan(req, res, next) {
  try {
    const detected = await scanAndSyncAllConflicts();

    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'CONFLICT_RESCAN',
      entityType: 'CONFLICT_ENGINE',
      outcome: 'SUCCESS',
      details: `Full system scan completed; ${detected.length} conflicts recorded.`
    });

    res.json({
      success: true,
      message: `Operational validation scan completed. Detected ${detected.length} conflict(s).`,
      count: detected.length,
      conflicts: detected
    });
  } catch (error) {
    next(error);
  }
}

async function resolveConflict(req, res, next) {
  try {
    const { id } = req.params;
    await query('UPDATE schedule_conflicts SET is_resolved = 1, resolved_at = NOW() WHERE id = ?', [id]);

    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'CONFLICT_RESOLVE',
      entityType: 'CONFLICT',
      entityId: id,
      outcome: 'SUCCESS',
      details: 'Planner marked conflict as resolved'
    });

    res.json({ success: true, message: 'Conflict marked as resolved.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listConflicts,
  triggerScan,
  resolveConflict
};
