const express = require("express");
const router = express.Router();
const { protect, checkRole } = require("../middlewares/authMiddleware");

const {
  createReceipt,
  getReceiptsByOrder,
  getReceipt,
  deleteReceipt,
  downloadReceiptPDF,
  getAllReceipts,
  downloadReceiptsPDF,
} = require("../controllers/receiptController");

router.get("/", protect, checkRole("admin"), getAllReceipts);
router.get("/pdf", protect, checkRole("admin"), downloadReceiptsPDF);

router.post("/", protect, checkRole("admin"), createReceipt);

router.get("/order/:orderId", protect, getReceiptsByOrder);

router.get("/:id/pdf", protect, checkRole("admin"), downloadReceiptPDF);

router.get("/:id", protect, getReceipt);

router.delete("/:id", protect, checkRole("admin"), deleteReceipt);

module.exports = router;
