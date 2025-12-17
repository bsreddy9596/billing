const express = require("express");
const router = express.Router();
const { protect, checkRole } = require("../middlewares/authMiddleware");
const invoiceController = require("../controllers/invoiceController");

/* ============================
   INVOICES (LIST + CREATE)
============================ */

router.post(
  "/",
  protect,
  checkRole("admin", "employee"),
  invoiceController.createInvoice
);

router.get(
  "/",
  protect,
  checkRole("admin", "employee"),
  invoiceController.getInvoices
);

/* ============================
   GENERATE (⚠️ MUST BE ABOVE :id)
============================ */

router.get(
  "/generate/:orderId",
  protect,
  checkRole("admin", "employee"),
  invoiceController.generateOrUpdateInvoice
);

/* ============================
   PDF (⚠️ ABOVE :id)
============================ */

router.get(
  "/:id/pdf",
  protect,
  checkRole("admin", "employee"),
  invoiceController.getInvoicePdf
);

/* ============================
   SINGLE INVOICE (DYNAMIC)
============================ */

router.get(
  "/:id",
  protect,
  checkRole("admin", "employee"),
  invoiceController.getInvoiceById
);

router.put(
  "/:id",
  protect,
  checkRole("admin", "employee"),
  invoiceController.updateInvoice
);

router.delete(
  "/:id",
  protect,
  checkRole("admin"),
  invoiceController.deleteInvoice
);

/* ============================
   PAYMENTS
============================ */

router.post(
  "/:id/payments",
  protect,
  checkRole("admin", "employee"),
  invoiceController.addPayment
);

router.put(
  "/:id/payments/:index",
  protect,
  checkRole("admin", "employee"),
  invoiceController.editPayment
);

router.delete(
  "/:id/payments/:index",
  protect,
  checkRole("admin", "employee"),
  invoiceController.deletePayment
);

module.exports = router;
