const activityService = require("../services/activityService");
const logger = require("../config/logger");
const mongoose = require("mongoose");

async function listActivities(req, res, next) {
  try {
    const result = await activityService.listActivities(req.query);
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    logger.error("Activity list error: %s", err.message);
    next(err);
  }
}

async function getActivityById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const activity = await activityService.getActivityById(id);
    if (!activity)
      return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, data: activity });
  } catch (err) {
    logger.error("Get activity error: %s", err.message);
    next(err);
  }
}

async function deleteActivity(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const activity = await activityService.deleteActivity(id);
    if (!activity)
      return res.status(404).json({ success: false, message: "Not found" });

    logger.info(
      "Activity deleted: %s by %s",
      id,
      req.user ? req.user._id : "system"
    );
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    logger.error("Delete activity error: %s", err.message);
    next(err);
  }
}

module.exports = {
  listActivities,
  getActivityById,
  deleteActivity,
};
