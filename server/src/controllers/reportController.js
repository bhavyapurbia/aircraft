const { query } = require('../config/db');

async function getUtilisationReport(req, res, next) {
  try {
    const { start_date, end_date } = req.query;

    let sql = `
      SELECT 
        r.id as resource_id,
        r.resource_code,
        r.resource_name,
        r.category,
        r.model,
        r.registration_no,
        r.status,
        COUNT(a.id) as sorties_count,
        COALESCE(ROUND(SUM(a.estimated_duration_hours), 1), 0.0) as total_flight_hours,
        COALESCE(ROUND(SUM(a.estimated_cost), 2), 0.00) as total_operational_cost,
        r.total_flight_hours as cumulative_airframe_hours
      FROM resources r
      LEFT JOIN activities a ON r.id = a.resource_id
        ${start_date ? 'AND a.start_time >= ?' : ''}
        ${end_date ? 'AND a.end_time <= ?' : ''}
      WHERE r.is_archived = 0
      GROUP BY r.id
      ORDER BY total_flight_hours DESC
    `;
    const params = [];
    if (start_date) params.push(start_date);
    if (end_date) params.push(end_date);

    const report = await query(sql, params);

    res.json({
      success: true,
      generated_at: new Date().toISOString(),
      data: report
    });
  } catch (error) {
    next(error);
  }
}

async function getMaintenanceReport(req, res, next) {
  try {
    const records = await query(`
      SELECT 
        m.*,
        r.resource_name,
        r.registration_no,
        r.model
      FROM maintenance_records m
      JOIN resources r ON m.resource_id = r.id
      ORDER BY m.start_time DESC
    `);

    res.json({
      success: true,
      generated_at: new Date().toISOString(),
      data: records
    });
  } catch (error) {
    next(error);
  }
}

async function getConflictsReport(req, res, next) {
  try {
    const records = await query(`
      SELECT 
        c.*,
        a.activity_code,
        a.title as activity_title,
        r.resource_name
      FROM schedule_conflicts c
      JOIN activities a ON c.activity_id = a.id
      JOIN resources r ON a.resource_id = r.id
      ORDER BY c.detected_at DESC
    `);

    res.json({
      success: true,
      generated_at: new Date().toISOString(),
      data: records
    });
  } catch (error) {
    next(error);
  }
}

async function getStaffWorkloadReport(req, res, next) {
  try {
    const records = await query(`
      SELECT 
        s.id as staff_id,
        s.staff_code,
        s.full_name,
        s.role_category,
        s.status,
        s.max_daily_duty_hours,
        s.current_duty_hours,
        COUNT(sa.activity_id) as total_missions_assigned,
        COALESCE(ROUND(SUM(a.estimated_duration_hours), 1), 0.0) as total_logged_mission_hours
      FROM staff s
      LEFT JOIN staff_activities sa ON s.id = sa.staff_id
      LEFT JOIN activities a ON sa.activity_id = a.id
      WHERE s.is_archived = 0
      GROUP BY s.id
      ORDER BY total_logged_mission_hours DESC
    `);

    res.json({
      success: true,
      generated_at: new Date().toISOString(),
      data: records
    });
  } catch (error) {
    next(error);
  }
}

async function exportReportCSV(req, res, next) {
  try {
    const { report_type = 'utilisation' } = req.query;

    if (report_type === 'utilisation') {
      const rows = await query(`
        SELECT r.resource_code, r.resource_name, r.category, r.registration_no, r.status,
               COUNT(a.id) as sorties_count,
               COALESCE(SUM(a.estimated_duration_hours), 0) as flight_hours,
               COALESCE(SUM(a.estimated_cost), 0) as total_cost
        FROM resources r
        LEFT JOIN activities a ON r.id = a.resource_id
        WHERE r.is_archived = 0
        GROUP BY r.id
      `);

      let csv = 'Resource Code,Resource Name,Category,Registration,Status,Sorties Count,Flight Hours,Total Cost (INR)\n';
      rows.forEach((r) => {
        csv += `"${r.resource_code}","${r.resource_name}","${r.category}","${r.registration_no}","${r.status}",${r.sorties_count},${r.flight_hours},${r.total_cost}\n`;
      });

      res.header('Content-Type', 'text/csv');
      res.attachment(`air-power-${report_type}-report.csv`);
      return res.send(csv);
    }

    if (report_type === 'maintenance') {
      const rows = await query(`
        SELECT m.maintenance_code, r.resource_name, m.maintenance_type, m.start_time, m.expected_completion, m.status, m.assigned_technician, m.cost_estimate
        FROM maintenance_records m
        JOIN resources r ON m.resource_id = r.id
      `);
      let csv = 'Maintenance Code,Resource,Type,Start Time,Expected Completion,Status,Technician,Cost Estimate\n';
      rows.forEach((r) => {
        csv += `"${r.maintenance_code}","${r.resource_name}","${r.maintenance_type}","${r.start_time}","${r.expected_completion}","${r.status}","${r.assigned_technician}",${r.cost_estimate}\n`;
      });
      res.header('Content-Type', 'text/csv');
      res.attachment('air-power-maintenance-report.csv');
      return res.send(csv);
    }

    res.status(400).json({ success: false, message: 'Invalid report type for export.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getUtilisationReport,
  getMaintenanceReport,
  getConflictsReport,
  getStaffWorkloadReport,
  exportReportCSV
};
