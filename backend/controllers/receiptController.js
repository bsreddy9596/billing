const Receipt = require("../models/Receipt");
const Order = require("../models/Order");
const Counter = require("../models/Counter");
const PDFDocument = require("pdfkit");

/* ================= AUTO RECEIPT NUMBER ================= */
const genReceiptNo = async () => {
  const counter = await Counter.findOneAndUpdate(
    { key: "receipt" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `SNGR-R${String(counter.seq).padStart(4, "0")}`;
};

exports.createReceipt = async (req, res) => {
  try {
    const { orderId, paymentId, amount, mode = "cash", note = "" } = req.body;

    if (!orderId || !paymentId || !amount) {
      return res.status(400).json({
        success: false,
        message: "orderId, paymentId & amount required",
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // 🔎 find exact payment
    const payment = order.payments.id(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found for receipt",
      });
    }

    /* ===== calculations ===== */
    const previousPaid = (order.payments || []).reduce(
      (s, p) => s + Number(p.amount || 0),
      0
    );

    const paidTillNow = previousPaid;
    const sale = Number(order.saleAmount) || Number(order.finalSalePrice) || 0;
    const balanceDue = Math.max(0, sale - paidTillNow);

    /* ===== create receipt ===== */
    const receipt = await Receipt.create({
      orderId,
      paymentId,
      amount,
      mode,
      note,
      receiptNo: await genReceiptNo(),
      paidTillNow,
      balanceDue,
    });

    /* 🔥 MOST IMPORTANT PART 🔥 */
    payment.receiptId = receipt._id;
    await order.save();

    res.status(201).json({
      success: true,
      data: receipt,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= GET RECEIPTS BY ORDER ================= */
exports.getReceiptsByOrder = async (req, res) => {
  try {
    const receipts = await Receipt.find({
      orderId: req.params.orderId,
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: receipts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= GET SINGLE RECEIPT ================= */
exports.getReceipt = async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id).populate({
      path: "orderId",
      select:
        "customerName customerPhone customerAddress drawings saleAmount finalSalePrice status",
    });

    if (!receipt) {
      return res
        .status(404)
        .json({ success: false, message: "Receipt not found" });
    }

    res.json({ success: true, data: receipt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= DELETE RECEIPT + ROLLBACK ================= */
exports.deleteReceipt = async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: "Receipt not found",
      });
    }

    const order = await Order.findById(receipt.orderId);

    if (order) {
      order.payments = (order.payments || []).filter(
        (p) => String(p._id) !== String(receipt.paymentId)
      );

      const paid = order.payments.reduce(
        (s, p) => s + Number(p.amount || 0),
        0
      );

      const sale =
        Number(order.saleAmount) || Number(order.finalSalePrice) || 0;

      const due = Math.max(0, sale - paid);

      order.paid = paid;
      order.due = due;
      order.paymentStatus = due === 0 ? "paid" : paid > 0 ? "partial" : "due";

      await order.save();
    }

    await receipt.deleteOne();

    res.json({
      success: true,
      message: "Receipt deleted & payment rolled back",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= SINGLE RECEIPT PDF ================= */
exports.downloadReceiptPDF = async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id).populate({
      path: "orderId",
      select: "customerName customerPhone customerAddress",
    });

    if (!receipt) {
      return res.status(404).json({ success: false });
    }

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${receipt.receiptNo}.pdf`
    );
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    doc.fontSize(18).text("SNGR Furnitures", { align: "center" });
    doc.fontSize(10).text("Payment Receipt", { align: "center" });
    doc.moveDown();

    doc.text(`Receipt No : ${receipt.receiptNo}`);
    doc.text(`Date       : ${receipt.createdAt.toLocaleDateString("en-IN")}`);
    doc.text(`Mode       : ${receipt.mode}`);
    doc.moveDown();

    doc.text(`Customer   : ${receipt.orderId?.customerName || "Walk-in"}`);
    doc.text(`Mobile     : ${receipt.orderId?.customerPhone || "-"}`);

    const addr =
      typeof receipt.orderId?.customerAddress === "string"
        ? receipt.orderId.customerAddress
        : "";

    if (addr) doc.text(`Address    : ${addr}`);

    doc.moveDown();
    doc.text(`Amount Paid: ₹${receipt.amount}`);
    doc.text(`Paid Till  : ₹${receipt.paidTillNow}`);
    doc.text(`Balance    : ₹${receipt.balanceDue}`);

    doc.moveDown(3);
    doc.text("Authorized Signature", { align: "right" });

    doc.end();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= GET ALL RECEIPTS (ADMIN) ================= */
exports.getAllReceipts = async (req, res) => {
  try {
    const receipts = await Receipt.find()
      .populate("orderId", "customerName customerPhone")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: receipts,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= ALL RECEIPTS PDF ================= */
exports.downloadReceiptsPDF = async (req, res) => {
  try {
    const { from, to } = req.query;

    const filter = {};
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const receipts = await Receipt.find(filter)
      .populate("orderId", "customerName customerPhone")
      .sort({ createdAt: 1 });

    const doc = new PDFDocument({ size: "A4", margin: 40 });

    /* HEADERS */
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=receipts-report.pdf"
    );

    doc.pipe(res);

    /* ===== TITLE ===== */
    doc
      .fontSize(18)
      .text("SNGR Furniture - Receipts Report", { align: "center" })
      .moveDown(0.5);

    doc
      .fontSize(10)
      .text(`Period: ${from || "Beginning"} to ${to || "Till Date"}`, {
        align: "center",
      })
      .moveDown(1);

    if (!receipts.length) {
      doc.text("No receipts found");
      doc.end();
      return;
    }

    /* ===== TABLE HEADER ===== */
    const startY = doc.y;
    const col = {
      receipt: 40,
      customer: 150,
      mobile: 260,
      date: 350,
      amount: 430,
    };

    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Receipt No", col.receipt, startY);
    doc.text("Customer", col.customer, startY);
    doc.text("Mobile", col.mobile, startY);
    doc.text("Date", col.date, startY);
    doc.text("Amount", col.amount, startY, { align: "right" });

    doc
      .moveTo(40, startY + 15)
      .lineTo(550, startY + 15)
      .stroke();

    doc.font("Helvetica");

    let y = startY + 25;
    let pageTotal = 0;
    const monthlyTotals = {};

    receipts.forEach((r) => {
      if (y > 760) {
        doc.addPage();
        y = 50;
      }

      const amt = Number(r.amount || 0);
      pageTotal += amt;

      const monthKey = new Date(r.createdAt).toLocaleString("en-IN", {
        month: "long",
        year: "numeric",
      });
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + amt;

      doc.text(r.receiptNo, col.receipt, y);
      doc.text(r.orderId?.customerName || "Walk-in", col.customer, y);
      doc.text(r.orderId?.customerPhone || "-", col.mobile, y);
      doc.text(new Date(r.createdAt).toLocaleDateString("en-IN"), col.date, y);
      doc.text(`₹${amt.toLocaleString()}`, col.amount, y, {
        align: "right",
      });

      y += 20;
    });

    /* ===== PAGE TOTAL ===== */
    doc.moveDown(1);
    doc
      .font("Helvetica-Bold")
      .text(`Total Amount: ₹${pageTotal.toLocaleString()}`, {
        align: "right",
      });

    /* ===== MONTHLY SUMMARY ===== */
    doc.addPage();
    doc.fontSize(16).text("Monthly Summary", { align: "center" }).moveDown();

    doc.fontSize(11).font("Helvetica-Bold");
    doc.text("Month", 80, doc.y);
    doc.text("Total Amount", 350, doc.y, { align: "right" });
    doc.moveDown(0.5);
    doc.moveTo(80, doc.y).lineTo(500, doc.y).stroke();

    doc.font("Helvetica");

    Object.entries(monthlyTotals).forEach(([month, total]) => {
      doc.moveDown(0.5);
      doc.text(month, 80);
      doc.text(`₹${total.toLocaleString()}`, 350, doc.y, {
        align: "right",
      });
    });

    doc.end();
  } catch (err) {
    console.error("PDF ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Failed to generate PDF",
    });
  }
};
