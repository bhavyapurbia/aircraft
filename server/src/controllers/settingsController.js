const { query } = require('../config/db');
const { logAudit } = require('../services/auditService');

async function getSettings(req, res, next) {
  try {
    const settings = await query('SELECT * FROM application_settings');
    const settingsMap = {};
    settings.forEach((s) => {
      settingsMap[s.setting_key] = s.setting_value;
    });

    res.json({
      success: true,
      data: settings,
      settings_map: settingsMap
    });
  } catch (error) {
    next(error);
  }
}

async function updateSetting(req, res, next) {
  try {
    const { setting_key, setting_value } = req.body;
    if (!setting_key) {
      return res.status(400).json({ success: false, message: 'Setting key is required.' });
    }

    await query(`
      INSERT INTO application_settings (setting_key, setting_value)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    `, [setting_key, String(setting_value)]);

    await logAudit({
      userId: req.user.id,
      username: req.user.username,
      action: 'SETTING_UPDATE',
      entityType: 'SETTINGS',
      entityId: setting_key,
      outcome: 'SUCCESS',
      details: `Updated setting ${setting_key} to "${setting_value}"`
    });

    res.json({ success: true, message: 'Setting saved successfully.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSettings,
  updateSetting
};
