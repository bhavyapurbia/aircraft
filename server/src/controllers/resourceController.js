const { query } = require('../config/db');
const { logAudit } = require('../services/auditService');

async function listResources(req, res, next) {
  try {
    const {
      search = '',
      status = '',
      category = '',
      sortBy = 'id',
      order = 'ASC',
      page = 1,
      limit = 10,
      includeArchived = 'false'
    } = req.query;

    const allowedSortFields = ['id', 'resource_name', 'resource_code', 'category', 'model', 'status', 'next_scheduled_maintenance', 'hourly_cost'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'id';
    const safeOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    let sql = 'SELECT * FROM resources WHERE 1=1';
    const params = [];

    if (includeArchived !== 'true') {
      sql += ' AND is_archived = 0';
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      sql += ' AND (resource_name LIKE ? OR resource_code LIKE ? OR registration_no LIKE ? OR model LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    // Get total count for pagination
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countRow] = await query(countSql, params);
    const total = countRow ? countRow.total : 0;

    // Apply sorting & pagination
    sql += ` ORDER BY ${safeSortBy} ${safeOrder}`;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), offset);

    const items = await query(sql, params);

    res.json({
      success: true,
      data: items,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        totalPages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    next(error);
  }
}

async function getResourceById(req, res, next) {
  try {
    const { id } = req.params;
    const resources = await query('SELECT * FROM resources WHERE id = ?', [id]);
    if (!resources.length) {
      return res.status(404).json({ success: false, message: 'Resource not found.' });
    }

    const resource = resources[0];

    // Get recent activities for this resource
    const activities = await query(
      `SELECT id, activity_code, title, category, priority, start_time, end_time, status, estimated_cost
       FROM activities
       WHERE resource_id = ?
       ORDER BY start_time DESC
       LIMIT 10`,
      [id]
    );

    // Get maintenance history
    const maintenance = await query(
      `SELECT * FROM maintenance_records
       WHERE resource_id = ?
       ORDER BY start_time DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...resource,
        recent_activities: activities,
        maintenance_records: maintenance
      }
    });
  } catch (error) {
    next(error);
  }
}

async function createResource(req, res, next) {
  try {
    const {
      resource_name,
      category,
      model,
      registration_no,
      status = 'Available',
      capacity_pax = 0,
      payload_capacity_kg = 0,
      base_location = 'Airfield Alpha (Western Hub)',
      hourly_cost = 1200,
      last_maintenance_date = null,
      next_scheduled_maintenance = null,
      notes = ''
    } = req.body;

    if (!resource_name || !category || !model || !registration_no) {
      return res.status(400).json({
        success: false,
        message: 'Resource name, category, model, and registration number are mandatory.'
      });
    }

    // Generate resource code
    const resource_code = `RES-AP-${Date.now().toString().slice(-4)}`;

    const result = await query(
      `INSERT INTO resources 
       (resource_code, resource_name, category, model, registration_no, status, capacity_pax, payload_capacity_kg, base_location, hourly_cost, last_maintenance_date, next_scheduled_maintenance, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        resource_code,
        resource_name,
        category,
        model,
        registration_no,
        status,
        capacity_pax,
        payload_capacity_kg,
        base_location,
        hourly_cost,
        last_maintenance_date || null,
        next_scheduled_maintenance || null,
        notes
      ]
    );

    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'RESOURCE_CREATE',
      entityType: 'RESOURCE',
      entityId: result.insertId,
      outcome: 'SUCCESS',
      details: `Created new aviation resource ${resource_name} (${registration_no})`
    });

    res.status(201).json({
      success: true,
      message: 'Aviation resource registered successfully.',
      id: result.insertId,
      resource_code
    });
  } catch (error) {
    next(error);
  }
}

async function updateResource(req, res, next) {
  try {
    const { id } = req.params;
    const {
      resource_name,
      category,
      model,
      registration_no,
      status,
      capacity_pax,
      payload_capacity_kg,
      base_location,
      hourly_cost,
      last_maintenance_date,
      next_scheduled_maintenance,
      notes
    } = req.body;

    const existing = await query('SELECT * FROM resources WHERE id = ?', [id]);
    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Resource not found.' });
    }

    await query(
      `UPDATE resources SET
         resource_name = ?,
         category = ?,
         model = ?,
         registration_no = ?,
         status = ?,
         capacity_pax = ?,
         payload_capacity_kg = ?,
         base_location = ?,
         hourly_cost = ?,
         last_maintenance_date = ?,
         next_scheduled_maintenance = ?,
         notes = ?
       WHERE id = ?`,
      [
        resource_name,
        category,
        model,
        registration_no,
        status,
        capacity_pax,
        payload_capacity_kg,
        base_location,
        hourly_cost,
        last_maintenance_date || null,
        next_scheduled_maintenance || null,
        notes,
        id
      ]
    );

    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'RESOURCE_UPDATE',
      entityType: 'RESOURCE',
      entityId: id,
      outcome: 'SUCCESS',
      details: `Updated parameters for ${resource_name}`
    });

    res.json({ success: true, message: 'Resource updated successfully.' });
  } catch (error) {
    next(error);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['Available', 'Scheduled', 'Under Maintenance', 'Unavailable', 'Archived'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    await query('UPDATE resources SET status = ? WHERE id = ?', [status, id]);

    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'RESOURCE_STATUS_CHANGE',
      entityType: 'RESOURCE',
      entityId: id,
      outcome: 'SUCCESS',
      details: `Changed status to ${status}`
    });

    res.json({ success: true, message: `Resource status updated to ${status}.` });
  } catch (error) {
    next(error);
  }
}

async function archiveResource(req, res, next) {
  try {
    const { id } = req.params;
    await query('UPDATE resources SET is_archived = 1, status = \'Archived\' WHERE id = ?', [id]);

    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'RESOURCE_ARCHIVE',
      entityType: 'RESOURCE',
      entityId: id,
      outcome: 'SUCCESS',
      details: 'Resource archived from active roster'
    });

    res.json({ success: true, message: 'Resource archived successfully.' });
  } catch (error) {
    next(error);
  }
}

async function exportResourcesCSV(req, res, next) {
  try {
    const items = await query('SELECT * FROM resources WHERE is_archived = 0 ORDER BY id ASC');
    const headers = ['ID', 'Code', 'Name', 'Category', 'Model', 'Registration', 'Status', 'Pax Capacity', 'Payload (kg)', 'Base', 'Hourly Cost', 'Flight Hours'];
    
    let csv = headers.join(',') + '\n';
    items.forEach((item) => {
      const row = [
        item.id,
        `"${item.resource_code}"`,
        `"${item.resource_name}"`,
        `"${item.category}"`,
        `"${item.model}"`,
        `"${item.registration_no}"`,
        `"${item.status}"`,
        item.capacity_pax,
        item.payload_capacity_kg,
        `"${item.base_location}"`,
        item.hourly_cost,
        item.total_flight_hours
      ];
      csv += row.join(',') + '\n';
    });

    res.header('Content-Type', 'text/csv');
    res.attachment('air-power-resources.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listResources,
  getResourceById,
  createResource,
  updateResource,
  updateStatus,
  archiveResource,
  exportResourcesCSV
};
