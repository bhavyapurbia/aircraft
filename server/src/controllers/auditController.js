const { query } = require('../config/db');

async function listAuditLogs(req, res, next) {
  try {
    const { action, entity_type, outcome, search, limit = 50, page = 1 } = req.query;

    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (action) {
      sql += ' AND action = ?';
      params.push(action);
    }
    if (entity_type) {
      sql += ' AND entity_type = ?';
      params.push(entity_type);
    }
    if (outcome) {
      sql += ' AND outcome = ?';
      params.push(outcome);
    }
    if (search) {
      sql += ' AND (username LIKE ? OR action LIKE ? OR details LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countRow] = await query(countSql, params);
    const total = countRow ? countRow.total : 0;

    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    params.push(parseInt(limit, 10), offset);

    const logs = await query(sql, params);

    res.json({
      success: true,
      data: logs,
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

module.exports = { listAuditLogs };
