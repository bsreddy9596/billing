const Payment = require("../models/Payment");
const Invoice = require("../models/Invoice");
const logger = require("../config/logger");

/* -------------------------------------------------------------
   📌 Helper: Recalculate paidAmount, dueAmount, status
------------------------------------------------------------- */
async function recalcInvoice(invoiceId) {
  const payments = await Payment.find({ invoiceId }).lean();

  const paid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) return;

  invoice.paidAmount = paid;
  invoice.dueAmount = invoice.total - paid;
  invoice.status =
    paid >= invoice.total ? "paid" : paid > 0 ? "partial" : "unpaid";

  await invoice.save();
}

/* -------------------------------------------------------------
   💰 1) Add Payment to Invoice
------------------------------------------------------------- */
exports.addPayment = async (req, res, next) => {
  try {
    const { amount, method = "cash", note, type } = req.body;
    const invoiceId = req.params.invoiceId;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid payment amount required",
      });
    }

    const payment = await Payment.create({
      invoiceId,
      amount,
      method,
      note,
      type: type || "payment", // ⭐ DEFAULT VALUE ADDED
      receivedBy: req.user._id,
    });

    await recalcInvoice(invoiceId);

    logger.info(`💰 Payment added to invoice: ${invoiceId}`);
    res.status(201).json({ success: true, data: payment });
  } catch (err) {
    logger.error(`❌ Add payment failed: ${err.message}`);
    next(err);
  }
};

/* -------------------------------------------------------------
   📄 2) Get all payments for invoice
------------------------------------------------------------- */
exports.getPaymentsByInvoice = async (req, res, next) => {
  try {
    const invoiceId = req.params.invoiceId;

    const payments = await Payment.find({ invoiceId })
      .populate("receivedBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, count: payments.length, data: payments });
  } catch (err) {
    logger.error(`❌ Get payments failed: ${err.message}`);
    next(err);
  }
};

/* -------------------------------------------------------------
   📌 3) Get single payment
------------------------------------------------------------- */
exports.getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate("receivedBy", "name")
      .lean();

    if (!payment)
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });

    res.json({ success: true, data: payment });
  } catch (err) {
    logger.error(`❌ Get payment by ID failed: ${err.message}`);
    next(err);
  }
};

/* -------------------------------------------------------------
   ✏ 4) Update payment
------------------------------------------------------------- */
exports.updatePayment = async (req, res, next) => {
  try {
    const paymentId = req.params.id;
    const { amount, method, note } = req.body;

    const payment = await Payment.findByIdAndUpdate(
      paymentId,
      { amount, method, note },
      { new: true }
    );

    if (!payment)
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });

    await recalcInvoice(payment.invoiceId);

    res.json({ success: true, data: payment });
  } catch (err) {
    logger.error(`❌ Update payment failed: ${err.message}`);
    next(err);
  }
};

/* -------------------------------------------------------------
   🗑 5) Delete payment
------------------------------------------------------------- */
exports.deletePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment)
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });

    await Payment.findByIdAndDelete(payment._id);

    await recalcInvoice(payment.invoiceId);

    res.json({ success: true, message: "Payment deleted" });
  } catch (err) {
    logger.error(`❌ Delete payment failed: ${err.message}`);
    next(err);
  }
};
