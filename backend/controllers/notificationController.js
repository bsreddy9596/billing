const notificationService = require("../services/notificationService");
const logger = require("../config/logger");

/**
 * 🔔 Get all notifications for logged-in user or their role
 */
async function getNotifications(req, res, next) {
  try {
    const notifications = await notificationService.getNotifications(req.user._id, req.user.role);

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
    const result = await notificationService.markAsRead(req.params.id, req.user._id, req.user.role);

    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }

    res.json({ success: true, data: result });
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
    await notificationService.markAllAsRead(req.user._id, req.user.role);
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
    const result = await notificationService.deleteNotification(req.params.id, req.user._id, req.user.role);

    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }

    logger.info("Notification deleted: %s", req.params.id);
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
    await notificationService.clearAll(req.user._id, req.user.role);

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
