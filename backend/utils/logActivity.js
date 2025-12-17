const ActivityLog = require("../models/ActivityLog");

async function logActivity({
  userId,
  action,
  targetType,
  targetId,
  message,
  meta,
}) {
  try {
    await ActivityLog.create({
      userId,
      action,
      targetType,
      targetId,
      message,
      meta,
    });
  } catch (err) {
    console.error("ActivityLog error:", err.message);
  }
}

module.exports = logActivity;
