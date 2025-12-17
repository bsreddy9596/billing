const express = require("express");
const router = express.Router();
const billingController = require("../controllers/billingController");
const { protect, checkRole } = require("../middlewares/authMiddleware");

// =============================
// 🧾 BILLING ROUTES (Admin Only)
// =============================

// 🔹 Create new bill
router.post("/", protect, checkRole("admin"), billingController.createBill);

// 🔹 Get all bills
router.get("/", protect, checkRole("admin"), billingController.getBills);

// 🔹 Get bill by ID
router.get("/:id", protect, checkRole("admin"), billingController.getBillById);

// 🔹 Import order details into bill
router.post(
  "/import-order",
  protect,
  checkRole("admin"),
  billingController.importOrderToBill
);

module.exports = router;
