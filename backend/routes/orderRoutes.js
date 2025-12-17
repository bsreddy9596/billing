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

  // NEW PAYMENT FUNCTIONS
  addPayment,
  editPayment,
  deletePayment,
} = require("../controllers/orderController");

/* ----------------------------------------------------------
   CREATE ORDER  (Employee/Admin)
---------------------------------------------------------- */
router.post("/", protect, checkRole("employee", "admin"), createOrder);

/* ----------------------------------------------------------
   UPDATE ORDER
---------------------------------------------------------- */
router.put("/:id", protect, checkRole("employee", "admin"), updateOrder);

/* ----------------------------------------------------------
   DELETE ORDER
---------------------------------------------------------- */
router.delete("/:id", protect, checkRole("employee", "admin"), deleteOrder);

/* ----------------------------------------------------------
   CONFIRM / REJECT ORDER (Admin Only)
---------------------------------------------------------- */
router.put("/confirm/:id", protect, checkRole("admin"), confirmOrder);
router.put("/reject/:id", protect, checkRole("admin"), rejectOrder);

/* ----------------------------------------------------------
   MATERIAL USAGE
---------------------------------------------------------- */
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

/* ----------------------------------------------------------
   EXPENSES (Admin Only)
---------------------------------------------------------- */
router.put("/:id/expense", protect, checkRole("admin"), addExpense);
router.put("/:id/expense/:expenseId", protect, checkRole("admin"), editExpense);
router.delete(
  "/:id/expense/:expenseId",
  protect,
  checkRole("admin"),
  deleteExpense
);

/* ----------------------------------------------------------
   ORDER STATUS UPDATE
---------------------------------------------------------- */
router.put(
  "/:id/status",
  protect,
  checkRole("employee", "admin"),
  updateOrderStatus
);

/* ----------------------------------------------------------
   LIST ORDERS
---------------------------------------------------------- */
router.get("/", protect, checkRole("admin"), getAllOrders);
router.get("/my", protect, checkRole("employee"), getMyOrders);

/* ----------------------------------------------------------
   GET SINGLE ORDER
---------------------------------------------------------- */
router.get(
  "/single/:id",
  protect,
  checkRole("employee", "admin"),
  getSingleOrder
);

/* ----------------------------------------------------------
   UPDATE DRAWING
---------------------------------------------------------- */
router.put(
  "/:id/update-drawing/:index",
  protect,
  checkRole("employee", "admin"),
  updateDrawing
);

/* ----------------------------------------------------------
   PAYMENTS (Added inside ORDER)
---------------------------------------------------------- */

// Add payment to order
router.post(
  "/:orderId/payments",
  protect,
  checkRole("employee", "admin"),
  addPayment
);

// Edit payment
router.put(
  "/:orderId/payments/:paymentId",
  protect,
  checkRole("admin"),
  editPayment
);

// Delete payment
router.delete(
  "/:orderId/payments/:paymentId",
  protect,
  checkRole("admin"),
  deletePayment
);

module.exports = router;
