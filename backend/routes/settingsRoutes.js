const express = require("express");
const router = express.Router();
const { protect, checkRole } = require("../middlewares/authMiddleware");
const {
  getSettings,
  updateSettings,
  resetSettings,
} = require("../controllers/settingsController");

// Admin only routes
router.get("/", protect, checkRole("admin"), getSettings);
router.put("/", protect, checkRole("admin"), updateSettings);
router.delete("/", protect, checkRole("admin"), resetSettings);

module.exports = router;
