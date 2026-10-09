const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { generateToken } = require('../utils/jwt');
const { logAudit } = require('../services/auditService');

async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.'
      });
    }

    const users = await query(
      `SELECT u.*, r.name as role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE (u.username = ? OR u.email = ?) AND u.is_active = 1
       LIMIT 1`,
      [username, username]
    );

    if (!users.length) {
      await logAudit({
        username,
        action: 'USER_LOGIN',
        entityType: 'AUTH',
        outcome: 'FAILURE',
        details: 'Invalid username or user inactive'
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your credentials.'
      });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      await logAudit({
        userId: user.id,
        username: user.username,
        action: 'USER_LOGIN',
        entityType: 'AUTH',
        outcome: 'FAILURE',
        details: 'Incorrect password entered'
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please check your password.'
      });
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      role_id: user.role_id,
      role_name: user.role_name
    });

    await logAudit({
      userId: user.id,
      username: user.username,
      action: 'USER_LOGIN',
      entityType: 'AUTH',
      entityId: user.id,
      outcome: 'SUCCESS',
      details: `Successful sign-in as role ${user.role_name}`
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role_id: user.role_id,
        role_name: user.role_name,
        department: user.department
      }
    });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    if (req.user) {
      await logAudit({
        userId: req.user.id,
        username: req.user.username,
        action: 'USER_LOGOUT',
        entityType: 'AUTH',
        entityId: req.user.id,
        outcome: 'SUCCESS'
      });
    }
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
}

async function getMe(req, res, next) {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { full_name, email, department } = req.body;
    await query(
      'UPDATE users SET full_name = ?, email = ?, department = ? WHERE id = ?',
      [full_name || req.user.full_name, email || req.user.email, department || req.user.department, req.user.id]
    );

    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'PROFILE_UPDATE',
      entityType: 'USER',
      entityId: req.user.id,
      outcome: 'SUCCESS'
    });

    res.json({
      success: true,
      message: 'Profile updated successfully.'
    });
  } catch (error) {
    next(error);
  }
}

async function listUsers(req, res, next) {
  try {
    const users = await query(`
      SELECT u.id, u.username, u.email, u.full_name, u.role_id, r.name as role_name, u.department, u.is_active, u.created_at
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ORDER BY u.id ASC
    `);
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
}

async function registerUser(req, res, next) {
  try {
    const { username, email, password, role_id, full_name, department } = req.body;
    if (!username || !email || !password || !role_id || !full_name) {
      return res.status(400).json({
        success: false,
        message: 'All fields (username, email, password, role_id, full_name) are required.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const result = await query(
      `INSERT INTO users (username, email, password_hash, role_id, full_name, department)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, email, hash, role_id, full_name, department || 'Operations']
    );

    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'USER_REGISTER',
      entityType: 'USER',
      entityId: result.insertId,
      outcome: 'SUCCESS',
      details: `Created new user ${username} with role_id ${role_id}`
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      userId: result.insertId
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  logout,
  getMe,
  updateProfile,
  listUsers,
  registerUser
};
