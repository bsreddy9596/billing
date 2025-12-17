// controllers/invoiceController.js
const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const Invoice = require("../models/Invoice");
const Order = require("../models/Order");
const Product = require("../models/Product");

const PDFDocument = require("pdfkit");
const logger = require("../config/logger");

async function generateInvoiceNumber() {
  const prefix = process.env.INVOICE_PREFIX || "INV";
  const year = new Date().getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  const count = await Invoice.countDocuments({
    createdAt: { $gte: start, $lt: end },
  });

  const seq = String(count + 1).padStart(4, "0");
  return `${prefix}-${year}-${seq}`;
}

function emitSafe(req, event, payload) {
  try {
    const io = req?.app?.get("io");
    if (io && typeof io.emit === "function") io.emit(event, payload);
  } catch (e) {
    // don't crash on socket errors
    logger.warn(`WebSocket emit failed for ${event}: ${e.message}`);
  }
}

function recalcInvoiceTotals(invoice) {
  const paidAmount = (invoice.payments || []).reduce(
    (s, p) => s + (Number(p.amount) || 0),
    0
  );
  invoice.paidAmount = Number(Number(paidAmount).toFixed(2));
  invoice.dueAmount = Number(
    Math.max(0, (invoice.total || 0) - invoice.paidAmount).toFixed(2)
  );
  invoice.status =
    invoice.paidAmount >= (invoice.total || 0)
      ? "paid"
      : invoice.paidAmount > 0
      ? "partial"
      : "unpaid";
}

exports.createInvoice = async (req, res, next) => {
  try {
    const {
      orderId,
      customerName,
      customerPhone,
      customerAddress,
      items = [],
      tax = 0,
      discount = 0,
      payments = [],
    } = req.body;

    /* ===============================
       BASIC VALIDATION
    ================================ */
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Items are required",
      });
    }

    /* ===============================
       CHECK EXISTING INVOICE
    ================================ */
    let existingInvoice = null;
    if (orderId) {
      existingInvoice = await Invoice.findOne({ orderId });
    }

    /* ===============================
       COMPUTE ITEMS
    ================================ */
    let subTotal = 0;

    const computedItems = items.map((it) => {
      const qty = Number(it.qty || it.quantity || 1);
      const rate = Number(it.rate ?? it.price ?? 0);
      const amount = Number((qty * rate).toFixed(2));
      subTotal += amount;

      let productId = it.productId || null;

      // 🔥 FORCE ObjectId
      if (productId && typeof productId === "string") {
        productId = new mongoose.Types.ObjectId(productId);
      }

      return {
        productId, // ✅ GUARANTEED ObjectId
        description: it.description || it.name || "",
        qty,
        rate,
        amount,
      };
    });

    /* ===============================
       🔴 STRICT PRODUCT VALIDATION
    ================================ */
    for (const item of computedItems) {
      if (!item.productId) {
        return res.status(400).json({
          success: false,
          message:
            "ProductId missing in invoice items. Please select product properly.",
        });
      }
    }

    const taxAmount = Number(((subTotal * tax) / 100).toFixed(2));
    const total = Number(
      Math.max(0, subTotal + taxAmount - Number(discount || 0)).toFixed(2)
    );

    /* ======================================================
       UPDATE EXISTING INVOICE (NO STOCK TOUCH)
    ====================================================== */
    if (existingInvoice) {
      existingInvoice.customerName = customerName;
      existingInvoice.customerPhone = customerPhone;
      existingInvoice.customerAddress = customerAddress;
      existingInvoice.items = computedItems;
      existingInvoice.subTotal = subTotal;
      existingInvoice.tax = tax;
      existingInvoice.taxAmount = taxAmount;
      existingInvoice.discount = Number(discount || 0);
      existingInvoice.total = total;
      existingInvoice.payments = payments || [];

      recalcInvoiceTotals(existingInvoice);
      await existingInvoice.save();

      emitSafe(req, "invoice:updated", { invoiceId: existingInvoice._id });
      return res.json({ success: true, data: existingInvoice });
    }

    /* ======================================================
       CREATE NEW INVOICE + 🔻 STOCK DEDUCT
    ====================================================== */

    for (const item of computedItems) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      if (product.stockQty < item.qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stockQty}`,
        });
      }

      product.stockQty -= item.qty;
      await product.save();
    }

    /* ===============================
       CREATE INVOICE
    ================================ */
    const invoiceNumber = await generateInvoiceNumber();

    const invoiceDoc = await Invoice.create({
      orderId: orderId || null,
      invoiceNumber,
      customerName,
      customerPhone,
      customerAddress,
      items: computedItems,
      subTotal,
      tax,
      taxAmount,
      discount: Number(discount || 0),
      total,
      payments,
      paidAmount: payments.reduce((s, p) => s + Number(p.amount || 0), 0),
      dueAmount:
        total - payments.reduce((s, p) => s + Number(p.amount || 0), 0),
      status: payments.length > 0 ? "partial" : "unpaid",
      createdBy: req.user._id,
    });
    /* ===============================
   🔔 CREATE NOTIFICATION
================================ */
    const io = req.app.get("io");

    await Notification.create({
      toRole: "admin", // or "employee" if needed
      title: "New Invoice Created",
      body: `Invoice ${invoiceNumber} created for ${customerName}`,
      data: {
        invoiceId: invoiceDoc._id,
        invoiceNumber,
        total,
      },
    });

    // 🔥 REAL-TIME SOCKET EVENT
    io.emit("notification:new", {
      title: "New Invoice Created",
      body: `Invoice ${invoiceNumber} - ₹${total}`,
    });

    if (orderId) {
      await Order.findByIdAndUpdate(orderId, {
        invoiceNumber: invoiceDoc.invoiceNumber,
      });
    }

    emitSafe(req, "invoice:created", {
      invoiceId: invoiceDoc._id,
      invoiceNumber,
    });

    return res.status(201).json({ success: true, data: invoiceDoc });
  } catch (err) {
    console.error("❌ Invoice Error:", err);
    next(err);
  }
};

exports.getInvoices = async (req, res, next) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 }).lean();

    const data = invoices.map((inv) => ({
      ...inv,
      paidAmount: (inv.payments || []).reduce(
        (sum, p) => sum + Number(p.amount || 0),
        0
      ),
    }));

    res.json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

exports.getInvoiceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid invoice id",
      });
    }

    const invoice = await Invoice.findById(id)
      .populate("createdBy", "name")
      .lean();

    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, message: "Invoice not found" });
    }

    res.json({ success: true, data: invoice });
  } catch (err) {
    logger.error(`Get invoice by id error: ${err.message}`);
    next(err);
  }
};

exports.addPayment = async (req, res, next) => {
  try {
    const invoiceId = req.params.id;
    const { amount, method = "cash", note } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Valid amount required" });
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice)
      return res
        .status(404)
        .json({ success: false, message: "Invoice not found" });

    // Create payment object (date included)
    const paymentObj = {
      label: "Payment",
      amount: Number(amount),
      date: new Date(),
      method,
      note: note || "",
      receivedBy: req.user._id,
    };

    invoice.payments = invoice.payments || [];
    invoice.payments.push(paymentObj);

    // Recalc totals
    recalcInvoiceTotals(invoice);

    // Avoid overpay clamping (we still record overpayment but set due to 0)
    if (invoice.paidAmount > invoice.total) {
      // keep paidAmount as-is but due is zero
      invoice.dueAmount = 0;
    }

    await invoice.save();

    // If invoice is linked to an Order -> push payment to Order.payments (keeps order in sync)
    if (invoice.orderId) {
      try {
        const order = await Order.findById(invoice.orderId);
        if (order) {
          order.payments = order.payments || [];
          order.payments.push({
            type: "payment",
            amount: Number(amount),
            note:
              `Via invoice ${invoice.invoiceNumber}` +
              (note ? ` - ${note}` : ""),
            paidBy: req.user._id,
            paidAt: new Date(),
          });
          await order.save();
        }
      } catch (err) {
        logger.warn(
          `Failed to sync payment to order ${invoice.orderId}: ${err.message}`
        );
      }
    }

    logger.info(
      `Payment added to invoice ${invoice.invoiceNumber}: ₹${amount} by ${req.user._id}`
    );

    // Emit websocket
    emitSafe(req, "invoice:payment_added", {
      invoiceId: invoice._id,
      amount: Number(amount),
    });
    emitSafe(req, "invoice:updated", { invoiceId: invoice._id });

    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    logger.error(`Add payment error: ${err.message}`);
    next(err);
  }
};

exports.editPayment = async (req, res, next) => {
  try {
    const { id: invoiceId, index } = req.params;
    const idx = Number(index);
    if (isNaN(idx))
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment index" });

    const { amount, date, method, note, label } = req.body;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice)
      return res
        .status(404)
        .json({ success: false, message: "Invoice not found" });

    invoice.payments = invoice.payments || [];
    if (idx < 0 || idx >= invoice.payments.length) {
      return res
        .status(404)
        .json({ success: false, message: "Payment entry not found" });
    }

    // Update fields permissively
    const p = invoice.payments[idx];
    if (amount !== undefined) p.amount = Number(amount) || 0;
    if (date !== undefined) p.date = new Date(date);
    if (method !== undefined) p.method = method;
    if (note !== undefined) p.note = note;
    if (label !== undefined) p.label = label;

    // Recalc totals
    recalcInvoiceTotals(invoice);

    await invoice.save();

    // Optionally sync to Order: try to update the latest matching payment on order (best-effort)
    if (invoice.orderId) {
      try {
        const order = await Order.findById(invoice.orderId);
        if (order && Array.isArray(order.payments)) {
          // best-effort: find last payment that mentions this invoice number
          const matchIdx = order.payments
            .map((x, i) => ({ x, i }))
            .reverse()
            .find((pair) =>
              (pair.x.note || "").includes(invoice.invoiceNumber)
            );
          if (matchIdx) {
            const actualIdx = order.payments.length - 1 - matchIdx.i;
            if (amount !== undefined)
              order.payments[actualIdx].amount = Number(amount) || 0;
            if (note !== undefined)
              order.payments[actualIdx].note =
                `Via invoice ${invoice.invoiceNumber}` +
                (note ? ` - ${note}` : "");
            if (date !== undefined)
              order.payments[actualIdx].paidAt = new Date(date);
            await order.save();
          }
        }
      } catch (err) {
        logger.warn(
          `Failed to sync edited payment to order ${invoice.orderId}: ${err.message}`
        );
      }
    }

    emitSafe(req, "invoice:payment_updated", {
      invoiceId: invoice._id,
      index: idx,
    });
    emitSafe(req, "invoice:updated", { invoiceId: invoice._id });

    res.json({ success: true, data: invoice });
  } catch (err) {
    logger.error(`Edit payment error: ${err.message}`);
    next(err);
  }
};

exports.deletePayment = async (req, res, next) => {
  try {
    const { id: invoiceId, index } = req.params;
    const idx = Number(index);
    if (isNaN(idx))
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment index" });

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice)
      return res
        .status(404)
        .json({ success: false, message: "Invoice not found" });

    invoice.payments = invoice.payments || [];
    if (idx < 0 || idx >= invoice.payments.length)
      return res
        .status(404)
        .json({ success: false, message: "Payment entry not found" });

    const removed = invoice.payments.splice(idx, 1)[0];

    // Recalc totals
    recalcInvoiceTotals(invoice);
    await invoice.save();

    // Best-effort: remove/sync payment from linked Order if it references this invoice
    if (invoice.orderId) {
      try {
        const order = await Order.findById(invoice.orderId);
        if (order && Array.isArray(order.payments)) {
          // remove last matching payment referencing this invoice
          for (let i = order.payments.length - 1; i >= 0; i--) {
            const p = order.payments[i];
            if ((p.note || "").includes(invoice.invoiceNumber)) {
              order.payments.splice(i, 1);
              break;
            }
          }
          await order.save();
        }
      } catch (err) {
        logger.warn(
          `Failed to sync deleted payment removal to order ${invoice.orderId}: ${err.message}`
        );
      }
    }

    logger.info(
      `Payment removed from invoice ${invoice.invoiceNumber}: ₹${removed.amount} by ${req.user._id}`
    );

    emitSafe(req, "invoice:payment_deleted", {
      invoiceId: invoice._id,
      removedAmount: removed.amount,
    });
    emitSafe(req, "invoice:updated", { invoiceId: invoice._id });

    res.json({ success: true, data: invoice });
  } catch (err) {
    logger.error(`Delete payment error: ${err.message}`);
    next(err);
  }
};

exports.getInvoicePdf = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice)
      return res
        .status(404)
        .json({ success: false, message: "Invoice not found" });

    /* ======================================================
       🔒 LOCK INVOICE ON PRINT (FIRST TIME)
    ====================================================== */
    if (!invoice.locked) {
      invoice.locked = true;
      invoice.printedAt = new Date();
      invoice.printedBy = req.user?._id || null;
      await invoice.save();
    }

    /* ======================================================
       📦 AUTO MARK ORDER AS BILLED
    ====================================================== */
    if (invoice.orderId) {
      const order = await Order.findById(invoice.orderId);
      if (order && order.status !== "billed") {
        order.status = "billed";
        order.billedAt = new Date();
        await order.save();
      }
    }

    /* ======================================================
       PDF GENERATION STARTS
    ====================================================== */
    const BRAND = {
      name: process.env.SHOP_NAME || "SNGR Furnitures",
      address:
        process.env.SHOP_ADDRESS ||
        "Old Bus Stand Road, Near Market, Metpally, Telangana",
      phone: process.env.SHOP_PHONE || "+91 98765 43210",
      logoUrl: process.env.SHOP_LOGO || null,
      gst: process.env.SHOP_GST || "",
    };

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${invoice.invoiceNumber || "invoice"}.pdf`
    );

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    doc.pipe(res);

    // Header
    if (BRAND.logoUrl) {
      try {
        doc.image(BRAND.logoUrl, 40, 40, { width: 90 });
      } catch {}
    }

    doc.fontSize(16).text(BRAND.name, 140, 45);
    doc.fontSize(10).text(BRAND.address, 140, 64);
    if (BRAND.phone) doc.text(`Phone: ${BRAND.phone}`, 140, 78);
    if (BRAND.gst) doc.text(`GST: ${BRAND.gst}`, 140, 92);

    // Invoice meta
    doc.fontSize(20).text("INVOICE", { align: "right" });
    doc
      .fontSize(10)
      .text(`Invoice: ${invoice.invoiceNumber}`, { align: "right" });
    doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, {
      align: "right",
    });
    doc.moveDown(1.5);

    // Customer
    doc.fontSize(11).text("Bill To:", 40);
    doc.fontSize(10).text(invoice.customerName || "-", { indent: 20 });
    if (invoice.customerPhone) doc.text(invoice.customerPhone, { indent: 20 });
    if (invoice.customerAddress)
      doc.text(invoice.customerAddress, { indent: 20 });
    doc.moveDown();

    // Items table
    const tableTop = doc.y;
    doc.fontSize(11);
    doc.text("Description", 40, tableTop);
    doc.text("Qty", 320, tableTop);
    doc.text("Rate", 380, tableTop, { width: 80, align: "right" });
    doc.text("Amount", 460, tableTop, { width: 80, align: "right" });
    doc.moveDown();

    (invoice.items || []).forEach((it) => {
      const y = doc.y;
      doc.fontSize(10).text(it.description || "-", 40, y);
      doc.text(String(it.qty || 0), 320, y);
      doc.text((it.rate || 0).toFixed(2), 380, y, {
        width: 80,
        align: "right",
      });
      doc.text((it.amount || 0).toFixed(2), 460, y, {
        width: 80,
        align: "right",
      });
      doc.moveDown();
    });

    doc.moveDown(0.5);

    // Totals
    doc.text(`Subtotal: ₹${invoice.subTotal.toFixed(2)}`, { align: "right" });
    doc.text(`Tax (${invoice.tax || 0}%): ₹${invoice.taxAmount.toFixed(2)}`, {
      align: "right",
    });
    doc.text(`Discount: ₹${(invoice.discount || 0).toFixed(2)}`, {
      align: "right",
    });
    doc
      .fontSize(12)
      .text(`Total: ₹${invoice.total.toFixed(2)}`, { align: "right" });
    doc.moveDown();

    // Payments
    doc.fontSize(11).text("Payments:", 40);
    (invoice.payments || []).forEach((p) => {
      doc
        .fontSize(10)
        .text(
          `${p.date ? new Date(p.date).toLocaleDateString() : "-"} • ${
            p.label || "Payment"
          } • ₹${Number(p.amount).toFixed(2)} ${
            p.method ? `(${p.method})` : ""
          }`,
          { indent: 10 }
        );
    });

    doc.moveDown();
    doc.fontSize(11).text(`Paid: ₹${invoice.paidAmount.toFixed(2)}`, {
      align: "right",
    });
    doc.text(`Due: ₹${invoice.dueAmount.toFixed(2)}`, { align: "right" });
    doc.text(`Status: ${invoice.status}`, { align: "right" });

    // Signature
    doc.moveDown(3);
    doc.text("For " + BRAND.name, 40);
    doc.moveDown(2);
    doc.text("__________________________", { align: "right" });
    doc.text("Authorized Signatory", { align: "right" });

    doc.end();
  } catch (err) {
    logger.error(`Generate invoice PDF error: ${err.message}`);
    next(err);
  }
};

exports.updateInvoice = async (req, res, next) => {
  const canUseSession =
    mongoose.connection.readyState === 1 &&
    mongoose.connection?.db?.serverConfig?.s?.options?.replicaSet;

  const session = canUseSession ? await mongoose.startSession() : null;
  if (session) session.startTransaction();

  try {
    const invoice = await Invoice.findById(req.params.id).session(
      session || null
    );
    if (!invoice) {
      if (session) await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Invoice not found" });
    }

    if (invoice.locked && req.user.role !== "admin") {
      if (session) await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: "Invoice locked. Admin only can edit",
      });
    }

    /* ================= UPDATE BASIC FIELDS ================= */
    const allowed = [
      "customerName",
      "customerPhone",
      "customerAddress",
      "items",
      "tax",
      "discount",
    ];

    allowed.forEach((k) => {
      if (req.body[k] !== undefined) invoice[k] = req.body[k];
    });

    /* ================= ITEMS & TOTAL ================= */
    let subTotal = 0;

    if (req.body.items) {
      invoice.items = req.body.items.map((it) => {
        const qty = Number(it.qty || 1);
        const rate = Number(it.rate || 0);
        const amount = Number((qty * rate).toFixed(2));
        subTotal += amount;

        return {
          productId: it.productId || null,
          description: it.description,
          qty,
          rate,
          amount,
        };
      });
    } else {
      subTotal = Number(invoice.subTotal || 0);
    }

    invoice.subTotal = Number(subTotal.toFixed(2));
    invoice.taxAmount = Number(
      ((invoice.subTotal * (invoice.tax || 0)) / 100).toFixed(2)
    );

    invoice.total = Number(
      (
        invoice.subTotal +
        invoice.taxAmount -
        Number(invoice.discount || 0)
      ).toFixed(2)
    );

    /* =====================================================
       STEP 1️⃣  INVOICE → ORDER PAYMENTS (SAVE SOURCE)
    ====================================================== */
    let syncedPayments = [];

    if (Array.isArray(req.body.payments)) {
      syncedPayments = req.body.payments.map((p) => ({
        type: p.label?.toLowerCase().includes("advance")
          ? "advance"
          : "payment",
        amount: Number(p.amount || 0),
        note: p.label || "Payment",
        paidAt: p.date ? new Date(p.date) : new Date(),
        method: p.method || "cash",
        paidBy: req.user?._id,
      }));
    }

    if (invoice.orderId && syncedPayments.length > 0) {
      const order = await Order.findById(invoice.orderId).session(
        session || null
      );

      if (order) {
        order.payments = syncedPayments;
        order.paid = syncedPayments.reduce(
          (s, p) => s + Number(p.amount || 0),
          0
        );

        order.due = Math.max(
          0,
          (order.saleAmount || order.totalAmount || 0) - order.paid
        );

        await order.save(session ? { session } : {});
      }
    }

    /* =====================================================
       STEP 2️⃣  ORDER → INVOICE PAYMENTS (MIRROR BACK)
    ====================================================== */
    if (invoice.orderId) {
      const order = await Order.findById(invoice.orderId).session(
        session || null
      );

      if (order) {
        invoice.payments = (order.payments || []).map((p) => ({
          amount: Number(p.amount || 0),
          date: p.paidAt,
          method: p.method,
          label: p.note || "Payment",
        }));

        invoice.paidAmount = invoice.payments.reduce(
          (s, p) => s + Number(p.amount || 0),
          0
        );

        invoice.dueAmount = Math.max(0, invoice.total - invoice.paidAmount);

        invoice.status =
          invoice.dueAmount === 0
            ? "paid"
            : invoice.paidAmount > 0
            ? "partial"
            : "unpaid";
      }
    }

    await invoice.save(session ? { session } : {});

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    emitSafe(req, "invoice:updated", { invoiceId: invoice._id });

    res.json({ success: true, data: invoice });
  } catch (err) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    next(err);
  }
};

exports.deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice)
      return res
        .status(404)
        .json({ success: false, message: "Invoice not found" });

    // Optionally: if linked to order, you may want to clear invoiceNumber on order
    if (invoice.orderId) {
      try {
        await Order.findByIdAndUpdate(invoice.orderId, {
          $unset: { invoiceNumber: "" },
        });
      } catch (err) {
        logger.warn(
          `Failed to unlink invoice from order ${invoice.orderId}: ${err.message}`
        );
      }
    }

    await invoice.deleteOne();

    emitSafe(req, "invoice:deleted", { invoiceId: req.params.id });

    res.json({ success: true, message: "Invoice deleted" });
  } catch (err) {
    logger.error(`Delete invoice error: ${err.message}`);
    next(err);
  }
};

exports.generateOrUpdateInvoice = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    console.log("🔄 generateOrUpdateInvoice CALLED for Order:", orderId);

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // 🔥 ALWAYS build payments from ORDER
    const syncedPayments = (order.payments || []).map((p) => ({
      amount: Number(p.amount || 0),
      date: p.paidAt || p.createdAt || new Date(),
      method: p.method || "cash",
      label: p.note || (p.type === "advance" ? "Advance" : "Payment"),
    }));

    const paidAmount = syncedPayments.reduce(
      (s, p) => s + Number(p.amount || 0),
      0
    );

    // STEP 1: Check if invoice already exists
    let invoice = await Invoice.findOne({ orderId });

    if (!invoice) {
      console.log("🆕 No invoice found → Creating new invoice");

      /* ================================
     🔻 PRODUCT STOCK DEDUCT HERE
  ================================= */
      for (const item of order.items || []) {
        const productId = item.productId;
        const qty = Number(item.qty || item.quantity || 0);

        console.log("➡ Deducting:", productId, qty);

        if (!productId || qty <= 0) continue;

        const product = await Product.findById(productId);
        if (!product) {
          return res.status(404).json({
            success: false,
            message: "Product not found",
          });
        }

        if (product.stockQty < qty) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.name}`,
          });
        }

        product.stockQty -= qty;
        await product.save();

        console.log(`✅ Stock updated: ${product.name} → ${product.stockQty}`);
      }
      /* ================================
     🔺 STOCK DEDUCT END
  ================================= */

      const invoiceNumber = await generateInvoiceNumber();

      invoice = await Invoice.create({
        orderId,
        invoiceNumber,
        customerName: order.customerName || "",
        customerPhone: order.customerPhone || "",
        customerAddress: order.customerAddress || "",
        items: order.items || [],
        subTotal: order.subTotal || 0,
        tax: order.tax || 0,
        taxAmount: order.taxAmount || 0,
        discount: order.discount || 0,
        total: order.totalAmount || 0,
        payments: syncedPayments,
        paidAmount,
        dueAmount: Math.max(0, (order.totalAmount || 0) - paidAmount),
        status:
          paidAmount >= (order.totalAmount || 0)
            ? "paid"
            : paidAmount > 0
            ? "partial"
            : "unpaid",
        createdBy: req.user._id,
      });
    } else {
      /* ======================================================
       ♻️ UPDATE EXISTING INVOICE → NO STOCK TOUCH
    ====================================================== */
      console.log("♻️ Invoice exists → Updating invoice");

      invoice.subTotal = order.subTotal ?? invoice.subTotal;
      invoice.tax = order.tax ?? invoice.tax;
      invoice.taxAmount = order.taxAmount ?? invoice.taxAmount;
      invoice.discount = order.discount ?? invoice.discount;
      invoice.total = order.totalAmount ?? invoice.total;

      invoice.payments = syncedPayments;
      invoice.paidAmount = paidAmount;
      invoice.dueAmount = Math.max(0, invoice.total - paidAmount);

      invoice.status =
        invoice.dueAmount === 0
          ? "paid"
          : invoice.paidAmount > 0
          ? "partial"
          : "unpaid";

      await invoice.save();
    }

    res.json({ success: true, data: invoice });
  } catch (err) {
    console.error("❌ generateOrUpdateInvoice Error:", err);
    next(err);
  }
};
