const ActivityLog = require("../models/ActivityLog");
const logger = require("../config/logger");
const mongoose = require("mongoose");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

async function listActivities(req, res, next) {
  try {
    const page = Math.max(Number(req.query.page) || DEFAULT_PAGE, 1);
    const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const { user, action, q, from, to } = req.query;
    const filter = {};

    if (user && mongoose.Types.ObjectId.isValid(user)) filter.userId = user;
    if (action) filter.action = action;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    if (q) {
      const regex = new RegExp(q, "i");
      filter.$or = [{ message: regex }, { "meta.detail": regex }];
    }

    const [total, data] = await Promise.all([
      ActivityLog.countDocuments(filter),
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.json({
      success: true,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      data,
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

    const activity = await ActivityLog.findById(id).lean();
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

    const activity = await ActivityLog.findByIdAndDelete(id);
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
