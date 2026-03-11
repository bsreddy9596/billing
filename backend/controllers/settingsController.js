const settingsService = require("../services/settingsService");
const logger = require("../config/logger");

/**
 * 🧾 Get current settings (for admin dashboard / invoice)
 */
async function getSettings(req, res, next) {
  try {
    const settings = await settingsService.getSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    logger.error("Get settings error: %s", err.message);
    next(err);
  }
}

/**
 * ⚙️ Update system settings (Admin only)
 */
async function updateSettings(req, res, next) {
  try {
    const settings = await settingsService.updateSettings(req.body, req.user._id);

    logger.info("Settings updated by %s", req.user._id);
    res.json({ success: true, message: "Settings updated", data: settings });
  } catch (err) {
    logger.error("Update settings error: %s", err.message);
    next(err);
  }
}

/**
 * 🔄 Reset to defaults
 */
async function resetSettings(req, res, next) {
  try {
    const defaults = await settingsService.resetSettings(req.user._id);

    logger.warn("Settings reset by %s", req.user._id);
    res.json({ success: true, message: "Settings reset", data: defaults });
  } catch (err) {
    logger.error("Reset settings error: %s", err.message);
    next(err);
  }
}

module.exports = {
  getSettings,
  updateSettings,
  resetSettings,
};
