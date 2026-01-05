const express = require("express");
const router = express.Router();
const { protect, checkRole } = require("../middlewares/authMiddleware");
const invoiceController = require("../controllers/invoiceController");

/* =====================================================
   🔥 ORDER → GET OR CREATE INVOICE (MAIN API)
   Used by OrderDetails → Invoice button
===================================================== */
router.post(
  "/order/:orderId",
  protect,
  checkRole("admin", "employee"),
  invoiceController.getOrCreateOrderInvoice
);

/* =====================================================
   🧾 PRODUCT BILLING (DIRECT SALE)
===================================================== */
router.post(
  "/product",
  protect,
  checkRole("admin", "employee"),
  invoiceController.createProductInvoice
);

/* =====================================================
   📄 INVOICE LIST
===================================================== */
router.get(
  "/",
  protect,
  checkRole("admin", "employee"),
  invoiceController.getInvoices
);
router.get(
  "/due",
  protect,
  checkRole("admin", "employee"),
  invoiceController.getDueInvoices
);
/* =====================================================
   📄 SINGLE INVOICE (BY INVOICE ID)
===================================================== */
router.get(
  "/:id",
  protect,
  checkRole("admin", "employee"),
  invoiceController.getInvoiceById
);

/* =====================================================
   🖨 PDF PRINT
===================================================== */
router.get(
  "/:id/pdf",
  protect,
  checkRole("admin", "employee"),
  invoiceController.getInvoicePdf
);

/* =====================================================
   ❌ CANCEL INVOICE (ADMIN ONLY)
===================================================== */
router.put(
  "/:id/cancel",
  protect,
  checkRole("admin"),
  invoiceController.cancelInvoice
);
router.patch(
  "/:id/payment",
  protect,
  checkRole("admin", "employee"),
  invoiceController.addInvoicePayment
);

module.exports = router;
