const mongoose = require("mongoose");
const Invoice = require("../models/Invoice");
const Order = require("../models/Order");
const Product = require("../models/Product");
const PDFDocument = require("pdfkit");

async function generateInvoiceNumber() {
  const prefix = process.env.INVOICE_PREFIX || "INV";
  const year = new Date().getFullYear();

  const count = await Invoice.countDocuments({
    createdAt: {
      $gte: new Date(year, 0, 1),
      $lt: new Date(year + 1, 0, 1),
    },
  });

  return `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;
}

function recalcTotals(invoice) {
  const payments = invoice.payments || [];
  const paid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);

  invoice.paidAmount = paid;
  invoice.dueAmount = Math.max(0, invoice.total - paid);
  invoice.status =
    invoice.dueAmount === 0 ? "paid" : paid > 0 ? "partial" : "unpaid";
}

exports.getOrCreateOrderInvoice = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId).lean();
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    /* ================= EXISTING INVOICE ================= */
    let invoice = await Invoice.findOne({
      invoiceType: "order",
      orderId,
      cancelled: false,
    });

    /* ================= PAYMENTS ================= */
    const orderPayments = (order.payments || []).map((p) => ({
      type: p.type || "payment",
      amount: Number(p.amount || 0),
      method: p.method || "cash",
      note: p.note || "",
      date: p.createdAt || new Date(),
      receiptId: p.receiptId || null,
    }));

    const paidAmount = orderPayments.reduce(
      (s, p) => s + Number(p.amount || 0),
      0
    );

    /* ================= UPDATE EXISTING ================= */
    if (invoice) {
      invoice.payments = orderPayments;
      invoice.paidAmount = paidAmount;
      invoice.dueAmount = Math.max(0, invoice.total - paidAmount);
      invoice.status =
        paidAmount === 0
          ? "unpaid"
          : paidAmount >= invoice.total
          ? "paid"
          : "partial";

      await invoice.save();
      return res.json({ success: true, data: invoice });
    }

    /* ================= ITEMS ================= */
    const saleAmount = Number(order.saleAmount || 0);

    let items = [];

    // Prefer drawings
    if (Array.isArray(order.drawings) && order.drawings.length > 0) {
      items = order.drawings.map((d, i) => ({
        productId: d._id || null,
        description: d.itemType || d.name || `Item ${i + 1}`,
        qty: Number(d.qty || 1),
        rate: Number(d.rate || saleAmount),
        amount: Number(d.rate || saleAmount) * Number(d.qty || 1),
      }));
    } else {
      // Fallback single line item
      items = [
        {
          productId: null,
          description: "Order Amount",
          qty: 1,
          rate: saleAmount,
          amount: saleAmount,
        },
      ];
    }

    const subTotal = items.reduce((s, i) => s + Number(i.amount || 0), 0);

    /* ================= CREATE INVOICE ================= */
    invoice = await Invoice.create({
      invoiceType: "order",
      orderId,
      invoiceNumber: await generateInvoiceNumber(),

      customerName: order.customerName || "General Customer",
      customerPhone: order.customerPhone || "",
      customerAddress: order.customerAddress || "",

      items,
      subTotal,
      total: subTotal,

      payments: orderPayments,
      paidAmount,
      dueAmount: Math.max(0, subTotal - paidAmount),

      status:
        paidAmount === 0
          ? "unpaid"
          : paidAmount >= subTotal
          ? "paid"
          : "partial",

      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    console.error("getOrCreateOrderInvoice ERROR:", err);
    next(err);
  }
};

exports.createProductInvoice = async (req, res, next) => {
  try {
    const {
      customerName,
      customerPhone,
      customerAddress,
      items = [],
      payments = [],
    } = req.body;

    if (!items.length) {
      return res.status(400).json({ message: "Items required" });
    }

    let subTotal = 0;
    const finalItems = [];

    /* ================= PRODUCT + STOCK ================= */
    for (const it of items) {
      const product = await Product.findById(it.productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (product.stockQty < it.qty) {
        return res
          .status(400)
          .json({ message: `Insufficient stock for ${product.name}` });
      }

      const amount = Number(it.qty) * Number(it.rate);
      subTotal += amount;

      product.stockQty -= it.qty;
      await product.save();

      finalItems.push({
        productId: product._id,
        description: product.name,
        qty: it.qty,
        rate: it.rate,
        amount,
      });
    }

    /* ================= PAYMENTS ================= */
    let paidAmount = 0;
    const finalPayments = payments.map((p) => {
      paidAmount += Number(p.amount || 0);

      return {
        label: p.label || "Payment",
        amount: Number(p.amount),
        date: p.date || new Date(),
        method: p.method || "cash",
        receivedBy: req.user._id,
      };
    });

    const dueAmount = Math.max(0, subTotal - paidAmount);

    const status =
      dueAmount === 0 ? "paid" : paidAmount > 0 ? "partial" : "unpaid";

    /* ================= INVOICE ================= */
    const invoice = await Invoice.create({
      invoiceType: "product",
      invoiceNumber: await generateInvoiceNumber(),

      customerName,
      customerPhone,
      customerAddress,

      items: finalItems,

      subTotal,
      total: subTotal,

      payments: finalPayments,
      paidAmount,
      dueAmount,
      status,

      createdBy: req.user._id,
      updatedBy: req.user._id,

      lastPaymentBy: finalPayments.length ? req.user._id : null,
      lastPaymentAt: finalPayments.length ? new Date() : null,
    });

    res.status(201).json({
      success: true,
      data: invoice,
    });
  } catch (err) {
    next(err);
  }
};

exports.getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("createdBy", "name role")
      .populate("payments.receivedBy", "name role")
      .lean();

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (err) {
    next(err);
  }
};

exports.getInvoices = async (req, res, next) => {
  try {
    const { type } = req.query; // all | order | product

    const filter = {};

    if (type && type !== "all") {
      filter.invoiceType = type;
    }

    const invoices = await Invoice.find(filter).sort({ createdAt: -1 }).lean();

    res.json({ success: true, data: invoices });
  } catch (err) {
    next(err);
  }
};

exports.cancelInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (invoice.paidAmount > 0) {
      return res
        .status(403)
        .json({ message: "Paid invoice cannot be cancelled" });
    }

    invoice.cancelled = true;
    invoice.cancelledAt = new Date();
    invoice.cancelledBy = req.user._id;
    await invoice.save();

    res.json({ success: true, message: "Invoice cancelled" });
  } catch (err) {
    next(err);
  }
};

exports.getInvoicePdf = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=${invoice.invoiceNumber}.pdf`
    );

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    doc.pipe(res);

    doc.fontSize(18).text("SNGR Furnitures");
    doc.fontSize(10).text(`Invoice No: ${invoice.invoiceNumber}`);
    doc.moveDown();

    invoice.items.forEach((i) => {
      doc.text(`${i.description}  ${i.qty} x ${i.rate} = ₹${i.amount}`);
    });

    doc.moveDown();
    doc.text(`Total: ₹${invoice.total}`);
    doc.text(`Paid: ₹${invoice.paidAmount}`);
    doc.text(`Due: ₹${invoice.dueAmount}`);

    doc.end();
  } catch (err) {
    next(err);
  }
};
exports.addInvoicePayment = async (req, res, next) => {
  try {
    const { amount, type = "payment", date, method = "cash" } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid payment amount required",
      });
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    if (invoice.cancelled) {
      return res.status(400).json({
        success: false,
        message: "Cancelled invoice cannot accept payments",
      });
    }

    /* ================= ADD PAYMENT ================= */
    invoice.payments.push({
      label: type === "advance" ? "Advance" : "Payment",
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
      method,
      receivedBy: req.user?._id || null, // ✅ VERY IMPORTANT
    });

    /* ================= RECALCULATE TOTALS ================= */
    const paidAmount = invoice.payments.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );

    invoice.paidAmount = paidAmount;
    invoice.dueAmount = Math.max(0, Number(invoice.total) - paidAmount);

    invoice.status =
      invoice.dueAmount === 0 ? "paid" : paidAmount > 0 ? "partial" : "unpaid";

    await invoice.save();

    /* ================= RETURN POPULATED ================= */
    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate("createdBy", "name role")
      .populate("payments.receivedBy", "name role")
      .lean();

    res.status(200).json({
      success: true,
      message: "Payment added successfully",
      data: populatedInvoice,
    });
  } catch (err) {
    next(err);
  }
};

exports.getDueInvoices = async (req, res, next) => {
  try {
    const invoices = await Invoice.find({
      cancelled: false,
      dueAmount: { $gt: 0 },
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: invoices.length,
      data: invoices,
    });
  } catch (err) {
    next(err);
  }
};
