const express = require("express");
const router = express.Router();
const { protect, checkRole } = require("../middlewares/authMiddleware");

const {
  createOrder,
  confirmOrder,
  rejectOrder,

  addMaterialUsage,
  editMaterialUsage,
  deleteMaterialUsage,

  addExpense,
  editExpense,
  deleteExpense,

  updateOrderStatus,
  getAllOrders,
  getMyOrders,
  getSingleOrder,

  updateDrawing,
  updateOrder,
  deleteOrder,

  // 🔥 PAYMENTS (ORDER LEVEL)
  addPayment,
  editPayment,
  deletePayment,
} = require("../controllers/orderController");

/* =====================================================
   ORDERS
===================================================== */

// Create Order (Employee / Admin)
router.post("/", protect, checkRole("employee", "admin"), createOrder);

// Update Order
router.put("/:id", protect, checkRole("employee", "admin"), updateOrder);

// Delete Order
router.delete("/:id", protect, checkRole("employee", "admin"), deleteOrder);

// Confirm / Reject (Admin Only)
router.put("/confirm/:id", protect, checkRole("admin"), confirmOrder);
router.put("/reject/:id", protect, checkRole("admin"), rejectOrder);

/* =====================================================
   MATERIAL USAGE
===================================================== */

router.put(
  "/:id/materials",
  protect,
  checkRole("employee", "admin"),
  addMaterialUsage
);

router.put(
  "/:id/materials/:materialUsageId",
  protect,
  checkRole("employee", "admin"),
  editMaterialUsage
);

router.delete(
  "/:id/materials/:materialUsageId",
  protect,
  checkRole("employee", "admin"),
  deleteMaterialUsage
);

/* =====================================================
   EXPENSES (Admin Only)
===================================================== */

router.put("/:id/expense", protect, checkRole("admin"), addExpense);

router.put("/:id/expense/:expenseId", protect, checkRole("admin"), editExpense);

router.delete(
  "/:id/expense/:expenseId",
  protect,
  checkRole("admin"),
  deleteExpense
);

/* =====================================================
   PAYMENTS (🔥 FIXED – THIS WAS MISSING 🔥)
===================================================== */

// Add payment / advance
router.post(
  "/:orderId/payments",
  protect,
  checkRole("employee", "admin"),
  addPayment
);

// Edit payment (Admin only)
router.put(
  "/:orderId/payments/:paymentId",
  protect,
  checkRole("admin"),
  editPayment
);

// Delete payment (Admin only)
router.delete(
  "/:orderId/payments/:paymentId",
  protect,
  checkRole("admin"),
  deletePayment
);

/* =====================================================
   ORDER STATUS
===================================================== */

router.put(
  "/:id/status",
  protect,
  checkRole("employee", "admin"),
  updateOrderStatus
);

/* =====================================================
   LIST ORDERS
===================================================== */

// Admin → all orders
router.get("/", protect, checkRole("admin"), getAllOrders);

// Employee → own orders
router.get("/my", protect, checkRole("employee"), getMyOrders);

/* =====================================================
   SINGLE ORDER
===================================================== */

router.get(
  "/single/:id",
  protect,
  checkRole("employee", "admin"),
  getSingleOrder
);

/* =====================================================
   DRAWINGS
===================================================== */

router.put(
  "/:id/update-drawing/:index",
  protect,
  checkRole("employee", "admin"),
  updateDrawing
);

module.exports = router;
