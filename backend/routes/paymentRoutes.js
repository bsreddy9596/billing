const express = require("express");
const router = express.Router();

const auth = require("../middlewares/authMiddleware");
const paymentCtrl = require("../controllers/paymentController");

/* Add payment */
router.post("/:invoiceId", auth.protect, paymentCtrl.addPayment);

/* Get all payments of invoice */
router.get(
  "/invoice/:invoiceId",
  auth.protect,
  paymentCtrl.getPaymentsByInvoice
);

/* Get single payment */
router.get("/:id", auth.protect, paymentCtrl.getPaymentById);

/* Update payment */
router.put("/:id", auth.protect, paymentCtrl.updatePayment);

/* Delete payment */
router.delete("/:id", auth.protect, paymentCtrl.deletePayment);

module.exports = router;
