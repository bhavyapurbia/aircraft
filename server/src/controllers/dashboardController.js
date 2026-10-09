const { query } = require('../config/db');

async function getSummary(req, res, next) {
  try {
    // 1. Resources count
    const [resStats] = await query(`
      SELECT 
        COUNT(*) as total_resources,
        SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) as available_resources,
        SUM(CASE WHEN status = 'Scheduled' THEN 1 ELSE 0 END) as scheduled_resources,
        SUM(CASE WHEN status = 'Under Maintenance' THEN 1 ELSE 0 END) as maintenance_resources,
        SUM(CASE WHEN status = 'Unavailable' THEN 1 ELSE 0 END) as unavailable_resources
      FROM resources
      WHERE is_archived = 0
    `);

    // 2. Upcoming activities & conflicts
    const [actStats] = await query(`
      SELECT 
        COUNT(*) as total_activities,
        SUM(CASE WHEN status = 'Scheduled' AND start_time >= NOW() THEN 1 ELSE 0 END) as upcoming_activities,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_activities,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_activities,
        SUM(CASE WHEN status = 'Delayed' THEN 1 ELSE 0 END) as delayed_activities
      FROM activities
    `);

    // 3. Active conflicts
    const [conflictStats] = await query(`
      SELECT 
        COUNT(*) as total_conflicts,
        SUM(CASE WHEN is_resolved = 0 THEN 1 ELSE 0 END) as active_conflicts,
        SUM(CASE WHEN severity = 'Critical Error' AND is_resolved = 0 THEN 1 ELSE 0 END) as critical_conflicts
      FROM schedule_conflicts
    `);

    // 4. Staff availability
    const [staffStats] = await query(`
      SELECT 
        COUNT(*) as total_staff,
        SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active_staff,
        SUM(CASE WHEN status = 'On Duty' THEN 1 ELSE 0 END) as on_duty_staff,
        SUM(CASE WHEN status = 'Leave' THEN 1 ELSE 0 END) as on_leave_staff
      FROM staff
      WHERE is_archived = 0
    `);

    // 5. Utilisation calculation
    const totalFleet = parseInt(resStats.total_resources || '1', 10);
    const inUseOrScheduled = parseInt(resStats.scheduled_resources || '0', 10);
    const utilisationPct = parseFloat(((inUseOrScheduled / totalFleet) * 100).toFixed(1));

    // 6. Recent system activity (audit logs)
    const recentActivity = await query(`
      SELECT id, username, action, entity_type, entity_id, outcome, details, timestamp
      FROM audit_logs
      ORDER BY id DESC
      LIMIT 8
    `);

    // 7. Recent notifications
    const recentNotifications = await query(`
      SELECT id, type, title, message, severity, is_read, created_at
      FROM notifications
      ORDER BY id DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      kpis: {
        total_resources: resStats.total_resources,
        available_resources: resStats.available_resources,
        scheduled_resources: resStats.scheduled_resources,
        maintenance_resources: resStats.maintenance_resources,
        unavailable_resources: resStats.unavailable_resources,
        upcoming_activities: actStats.upcoming_activities,
        completed_activities: actStats.completed_activities,
        delayed_activities: actStats.delayed_activities,
        active_conflicts: conflictStats.active_conflicts,
        critical_conflicts: conflictStats.critical_conflicts,
        total_staff: staffStats.total_staff,
        active_staff: staffStats.active_staff,
        on_duty_staff: staffStats.on_duty_staff,
        utilisation_percentage: utilisationPct,
        pending_planning_issues: conflictStats.active_conflicts
      },
      recent_activity: recentActivity,
      recent_notifications: recentNotifications
    });
  } catch (error) {
    next(error);
  }
}

async function getAnalytics(req, res, next) {
  try {
    // 1. Resource Availability by Category
    const availabilityByCategory = await query(`
      SELECT 
        category,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'Scheduled' THEN 1 ELSE 0 END) as scheduled,
        SUM(CASE WHEN status = 'Under Maintenance' THEN 1 ELSE 0 END) as maintenance,
        SUM(CASE WHEN status = 'Unavailable' THEN 1 ELSE 0 END) as unavailable
      FROM resources
      WHERE is_archived = 0
      GROUP BY category
    `);

    // 2. Scheduled vs Completed by category
    const activitiesByCategory = await query(`
      SELECT 
        category,
        COUNT(*) as total_count,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN status = 'Scheduled' THEN 1 ELSE 0 END) as scheduled_count,
        SUM(CASE WHEN status = 'Delayed' THEN 1 ELSE 0 END) as delayed_count
      FROM activities
      GROUP BY category
    `);

    // 3. Maintenance Workload by Type
    const maintenanceByType = await query(`
      SELECT 
        maintenance_type,
        COUNT(*) as count,
        SUM(cost_estimate) as total_estimated_cost
      FROM maintenance_records
      GROUP BY maintenance_type
    `);

    // 4. Utilisation over time (daily aggregated flight hours for past 10 days)
    const utilisationTimeline = await query(`
      SELECT 
        DATE(start_time) as date,
        COUNT(*) as total_sorties,
        ROUND(SUM(estimated_duration_hours), 1) as flight_hours,
        ROUND(SUM(estimated_cost), 0) as operational_cost
      FROM activities
      GROUP BY DATE(start_time)
      ORDER BY date ASC
    `);

    // 5. Delay trends and conflict distribution
    const conflictDistribution = await query(`
      SELECT 
        conflict_type,
        COUNT(*) as count,
        severity
      FROM schedule_conflicts
      GROUP BY conflict_type, severity
    `);

    res.json({
      success: true,
      availability_by_category: availabilityByCategory,
      activities_by_category: activitiesByCategory,
      maintenance_by_type: maintenanceByType,
      utilisation_timeline: utilisationTimeline,
      conflict_distribution: conflictDistribution
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSummary,
  getAnalytics
};
