const Setting = require("../models/Setting");
const logger = require("../config/logger");

/**
 * 🧾 Get current settings (for admin dashboard / invoice)
 */
async function getSettings(req, res, next) {
  try {
    let settings = await Setting.findOne().lean();
    if (!settings) {
      settings = await Setting.create({});
    }
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
    const data = req.body;
    let settings = await Setting.findOne();

    if (!settings) {
      settings = await Setting.create({
        ...data,
        updatedBy: req.user._id,
      });
    } else {
      Object.assign(settings, data);
      settings.updatedBy = req.user._id;
      await settings.save();
    }

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
    await Setting.deleteMany({});
    const defaults = await Setting.create({});
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
