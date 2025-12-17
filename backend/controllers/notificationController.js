const Notification = require("../models/Notification");
const logger = require("../config/logger");
const mongoose = require("mongoose");

/**
 * 🔔 Get all notifications for logged-in user or their role
 */
async function getNotifications(req, res, next) {
  try {
    const filter = {
      $or: [{ toUser: req.user._id }, { toRole: req.user.role }],
    };

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (err) {
    logger.error("Get notifications error: %s", err.message);
    next(err);
  }
}

/**
 * 🟢 Mark a notification as read
 */
async function markAsRead(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: "Invalid ID" });

    const notification = await Notification.findOneAndUpdate(
      { _id: id, $or: [{ toUser: req.user._id }, { toRole: req.user.role }] },
      { read: true },
      { new: true }
    );

    if (!notification)
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });

    res.json({ success: true, data: notification });
  } catch (err) {
    logger.error("Mark notification read error: %s", err.message);
    next(err);
  }
}

/**
 * 🧹 Mark all as read
 */
async function markAllAsRead(req, res, next) {
  try {
    await Notification.updateMany(
      {
        $or: [{ toUser: req.user._id }, { toRole: req.user.role }],
        read: false,
      },
      { read: true }
    );
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    logger.error("Mark all read error: %s", err.message);
    next(err);
  }
}

/**
 * ❌ Delete one notification (optional)
 */
async function deleteNotification(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: "Invalid ID" });

    const result = await Notification.findOneAndDelete({
      _id: id,
      $or: [{ toUser: req.user._id }, { toRole: req.user.role }],
    });

    if (!result)
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });

    logger.info("Notification deleted: %s", id);
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    logger.error("Delete notification error: %s", err.message);
    next(err);
  }
}

/**
 * 🚿 Clear all (admin / employee self-clear)
 */
async function clearAll(req, res, next) {
  try {
    await Notification.deleteMany({
      $or: [{ toUser: req.user._id }, { toRole: req.user.role }],
    });

    logger.info("All notifications cleared by %s", req.user._id);
    res.json({ success: true, message: "All notifications cleared" });
  } catch (err) {
    logger.error("Clear all notifications error: %s", err.message);
    next(err);
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAll,
};
