const { query } = require('../config/db');
const { logAudit } = require('../services/auditService');

async function listStaff(req, res, next) {
  try {
    const { status, role_category, search } = req.query;

    let sql = `
      SELECT s.*,
        GROUP_CONCAT(CONCAT(q.qualification_name, ' (', q.status, ')') SEPARATOR ', ') as qualifications_summary
      FROM staff s
      LEFT JOIN qualifications q ON s.id = q.staff_id
      WHERE s.is_archived = 0
    `;
    const params = [];

    if (status) {
      sql += ' AND s.status = ?';
      params.push(status);
    }
    if (role_category) {
      sql += ' AND s.role_category = ?';
      params.push(role_category);
    }
    if (search) {
      sql += ' AND (s.full_name LIKE ? OR s.staff_code LIKE ? OR s.email LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' GROUP BY s.id ORDER BY s.id ASC';

    const staffMembers = await query(sql, params);

    // Fetch individual qualifications for each staff
    for (const member of staffMembers) {
      member.qualifications = await query(
        'SELECT * FROM qualifications WHERE staff_id = ? ORDER BY expiry_date ASC',
        [member.id]
      );

      // Check for expiring / expired qualifications
      member.has_expired_qualification = member.qualifications.some((q) => q.status === 'Expired');
      member.has_expiring_qualification = member.qualifications.some((q) => q.status === 'Expiring Soon');
    }

    res.json({
      success: true,
      data: staffMembers
    });
  } catch (error) {
    next(error);
  }
}

async function getStaffById(req, res, next) {
  try {
    const { id } = req.params;
    const staffRows = await query('SELECT * FROM staff WHERE id = ?', [id]);
    if (!staffRows.length) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    const member = staffRows[0];
    const qualifications = await query('SELECT * FROM qualifications WHERE staff_id = ? ORDER BY expiry_date ASC', [id]);
    const assignedSorties = await query(`
      SELECT a.id, a.activity_code, a.title, a.start_time, a.end_time, a.status, sa.role_in_activity
      FROM staff_activities sa
      JOIN activities a ON sa.activity_id = a.id
      WHERE sa.staff_id = ?
      ORDER BY a.start_time DESC
      LIMIT 10
    `, [id]);

    res.json({
      success: true,
      data: {
        ...member,
        qualifications,
        assigned_sorties: assignedSorties
      }
    });
  } catch (error) {
    next(error);
  }
}

async function createStaff(req, res, next) {
  try {
    const {
      full_name,
      email,
      phone,
      role_category,
      max_daily_duty_hours = 10,
      base_location = 'Airfield Alpha (Western Hub)',
      qualifications = []
    } = req.body;

    if (!full_name || !email || !role_category) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email, and role category are required.'
      });
    }

    const staff_code = `STF-${Date.now().toString().slice(-4)}`;

    const result = await query(`
      INSERT INTO staff
      (staff_code, full_name, email, phone, role_category, status, max_daily_duty_hours, base_location)
      VALUES (?, ?, ?, ?, ?, 'Active', ?, ?)
    `, [staff_code, full_name, email, phone, role_category, max_daily_duty_hours, base_location]);

    const staffId = result.insertId;

    // Insert qualifications
    if (Array.isArray(qualifications)) {
      for (const q of qualifications) {
        if (q.qualification_name) {
          await query(`
            INSERT INTO qualifications (staff_id, qualification_name, certification_body, issue_date, expiry_date, status)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            staffId,
            q.qualification_name,
            q.certification_body || 'Civil Aviation Authority',
            q.issue_date || '2025-01-01',
            q.expiry_date || '2027-01-01',
            q.status || 'Valid'
          ]);
        }
      }
    }

    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'STAFF_CREATE',
      entityType: 'STAFF',
      entityId: staffId,
      outcome: 'SUCCESS',
      details: `Added staff member ${full_name} (${staff_code})`
    });

    res.status(201).json({
      success: true,
      message: 'Staff member profile registered.',
      staff_id: staffId,
      staff_code
    });
  } catch (error) {
    next(error);
  }
}

async function updateStaff(req, res, next) {
  try {
    const { id } = req.params;
    const {
      full_name,
      email,
      phone,
      role_category,
      status,
      max_daily_duty_hours,
      base_location,
      qualifications
    } = req.body;

    await query(`
      UPDATE staff SET
        full_name = ?,
        email = ?,
        phone = ?,
        role_category = ?,
        status = ?,
        max_daily_duty_hours = ?,
        base_location = ?
      WHERE id = ?
    `, [
      full_name,
      email,
      phone,
      role_category,
      status,
      max_daily_duty_hours,
      base_location,
      id
    ]);

    // Update qualifications if array provided
    if (Array.isArray(qualifications)) {
      await query('DELETE FROM qualifications WHERE staff_id = ?', [id]);
      for (const q of qualifications) {
        if (q.qualification_name) {
          await query(`
            INSERT INTO qualifications (staff_id, qualification_name, certification_body, issue_date, expiry_date, status)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            id,
            q.qualification_name,
            q.certification_body || 'Civil Aviation Authority',
            q.issue_date || '2025-01-01',
            q.expiry_date || '2027-01-01',
            q.status || 'Valid'
          ]);
        }
      }
    }

    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'STAFF_UPDATE',
      entityType: 'STAFF',
      entityId: id,
      outcome: 'SUCCESS',
      details: `Updated staff profile ${full_name}`
    });

    res.json({ success: true, message: 'Staff profile updated successfully.' });
  } catch (error) {
    next(error);
  }
}

async function archiveStaff(req, res, next) {
  try {
    const { id } = req.params;
    await query('UPDATE staff SET is_archived = 1, status = \'Archived\' WHERE id = ?', [id]);

    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'STAFF_ARCHIVE',
      entityType: 'STAFF',
      entityId: id,
      outcome: 'SUCCESS',
      details: 'Staff member archived'
    });

    res.json({ success: true, message: 'Staff record archived successfully.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listStaff,
  getStaffById,
  createStaff,
  updateStaff,
  archiveStaff
};
