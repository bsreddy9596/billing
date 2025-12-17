const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const notificationController = require("../controllers/notificationController");

router.get("/", protect, notificationController.getNotifications);
router.patch("/:id/read", protect, notificationController.markAsRead);
router.patch("/read-all", protect, notificationController.markAllAsRead);
router.delete("/:id", protect, notificationController.deleteNotification);
router.delete("/", protect, notificationController.clearAll);

module.exports = router;
