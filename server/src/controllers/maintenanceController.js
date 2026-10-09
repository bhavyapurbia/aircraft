const { query } = require('../config/db');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');

async function listMaintenance(req, res, next) {
  try {
    const { status, resource_id, type } = req.query;

    let sql = `
      SELECT m.*, r.resource_name, r.registration_no, r.category as resource_category
      FROM maintenance_records m
      JOIN resources r ON m.resource_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND m.status = ?';
      params.push(status);
    }
    if (resource_id) {
      sql += ' AND m.resource_id = ?';
      params.push(resource_id);
    }
    if (type) {
      sql += ' AND m.maintenance_type = ?';
      params.push(type);
    }

    sql += ' ORDER BY m.start_time DESC';
    const records = await query(sql, params);

    res.json({
      success: true,
      data: records
    });
  } catch (error) {
    next(error);
  }
}

async function getUpcomingMaintenance(req, res, next) {
  try {
    const records = await query(`
      SELECT m.*, r.resource_name, r.registration_no
      FROM maintenance_records m
      JOIN resources r ON m.resource_id = r.id
      WHERE m.status IN ('Scheduled', 'In Progress')
        AND m.start_time >= NOW()
      ORDER BY m.start_time ASC
      LIMIT 10
    `);

    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
}

async function getOverdueMaintenance(req, res, next) {
  try {
    const records = await query(`
      SELECT m.*, r.resource_name, r.registration_no
      FROM maintenance_records m
      JOIN resources r ON m.resource_id = r.id
      WHERE m.status IN ('In Progress', 'Scheduled')
        AND m.expected_completion < NOW()
      ORDER BY m.expected_completion ASC
    `);

    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
}

async function createMaintenance(req, res, next) {
  try {
    const {
      resource_id,
      maintenance_type,
      start_time,
      expected_completion,
      assigned_technician,
      cost_estimate = 0,
      notes = ''
    } = req.body;

    if (!resource_id || !maintenance_type || !start_time || !expected_completion || !assigned_technician) {
      return res.status(400).json({
        success: false,
        message: 'Resource, maintenance type, start time, expected completion, and technician are required.'
      });
    }

    const maintenance_code = `MNT-${Date.now().toString().slice(-6)}`;

    const result = await query(`
      INSERT INTO maintenance_records
      (maintenance_code, resource_id, maintenance_type, start_time, expected_completion, status, assigned_technician, cost_estimate, notes)
      VALUES (?, ?, ?, ?, ?, 'Scheduled', ?, ?, ?)
    `, [
      maintenance_code,
      resource_id,
      maintenance_type,
      start_time,
      expected_completion,
      assigned_technician,
      cost_estimate,
      notes
    ]);

    // Check if flight activities currently overlap this window
    const overlappingSorties = await query(`
      SELECT id, activity_code, title, start_time, end_time
      FROM activities
      WHERE resource_id = ?
        AND status NOT IN ('Cancelled', 'Completed')
        AND (start_time < ? AND end_time > ?)
    `, [resource_id, expected_completion, start_time]);

    for (const s of overlappingSorties) {
      await createNotification({
        userId: req.user.id,
        type: 'MAINTENANCE_DUE',
        title: `Maintenance window impacts ${s.activity_code}`,
        message: `Sortie "${s.title}" overlaps with ${maintenance_type} window (${start_time} - ${expected_completion}).`,
        severity: 'Urgent',
        relatedEntityType: 'maintenance',
        relatedEntityId: result.insertId
      });
    }

    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'MAINTENANCE_CREATE',
      entityType: 'MAINTENANCE',
      entityId: result.insertId,
      outcome: 'SUCCESS',
      details: `Created maintenance task ${maintenance_code} (${maintenance_type}) for resource ${resource_id}`
    });

    res.status(201).json({
      success: true,
      message: 'Maintenance task logged successfully.',
      id: result.insertId,
      maintenance_code,
      conflicts_impacted: overlappingSorties.length
    });
  } catch (error) {
    next(error);
  }
}

async function updateMaintenance(req, res, next) {
  try {
    const { id } = req.params;
    const {
      maintenance_type,
      start_time,
      expected_completion,
      actual_completion,
      status,
      assigned_technician,
      cost_estimate,
      notes
    } = req.body;

    const existing = await query('SELECT * FROM maintenance_records WHERE id = ?', [id]);
    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found.' });
    }

    const current = existing[0];

    await query(`
      UPDATE maintenance_records SET
        maintenance_type = ?,
        start_time = ?,
        expected_completion = ?,
        actual_completion = ?,
        status = ?,
        assigned_technician = ?,
        cost_estimate = ?,
        notes = ?
      WHERE id = ?
    `, [
      maintenance_type || current.maintenance_type,
      start_time || current.start_time,
      expected_completion || current.expected_completion,
      actual_completion || current.actual_completion,
      status || current.status,
      assigned_technician || current.assigned_technician,
      cost_estimate !== undefined ? cost_estimate : current.cost_estimate,
      notes !== undefined ? notes : current.notes,
      id
    ]);

    // Automatically update resource status based on maintenance status
    if (status === 'In Progress') {
      await query('UPDATE resources SET status = \'Under Maintenance\' WHERE id = ?', [current.resource_id]);
    } else if (status === 'Completed') {
      await query(`
        UPDATE resources 
        SET status = 'Available', last_maintenance_date = CURDATE() 
        WHERE id = ?
      `, [current.resource_id]);
    }

    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'MAINTENANCE_UPDATE',
      entityType: 'MAINTENANCE',
      entityId: id,
      outcome: 'SUCCESS',
      details: `Updated maintenance status to ${status || current.status}`
    });

    res.json({
      success: true,
      message: 'Maintenance record updated successfully.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listMaintenance,
  getUpcomingMaintenance,
  getOverdueMaintenance,
  createMaintenance,
  updateMaintenance
};
