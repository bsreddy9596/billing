const express = require("express");
const router = express.Router();
const { protect, checkRole } = require("../middlewares/authMiddleware");
const activityController = require("../controllers/activityController");

// =============================
// 🧾 ACTIVITY ROUTES (Admin Only)
// =============================

// 🔹 Get all activities (with filters, pagination)
router.get("/", protect, checkRole("admin"), activityController.listActivities);

// 🔹 Get single activity by ID
router.get(
  "/:id",
  protect,
  checkRole("admin"),
  activityController.getActivityById
);

// 🔹 Delete single activity
router.delete(
  "/:id",
  protect,
  checkRole("admin"),
  activityController.deleteActivity
);

module.exports = router;
