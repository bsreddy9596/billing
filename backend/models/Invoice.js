const mongoose = require("mongoose");

/* ===============================
   LINE ITEM (PRODUCT SALE)
================================ */
const lineItemSchema = new mongoose.Schema(
  {
    // 🔥 REQUIRED FOR STOCK + PROFIT
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    qty: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },

    rate: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    amount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

/* ===============================
   PAYMENT
================================ */
const paymentSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      default: "Payment",
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    date: {
      type: Date,
      default: Date.now,
    },

    method: {
      type: String,
      default: "cash",
    },

    // employee/admin who received payment
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { _id: false }
);

/* ===============================
   INVOICE
================================ */
const invoiceSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    invoiceNumber: {
      type: String,
      unique: true,
      required: true,
    },

    customerName: {
      type: String,
      trim: true,
    },

    customerPhone: {
      type: String,
      trim: true,
    },

    customerAddress: {
      type: String,
      trim: true,
    },

    // 🔥 PRODUCTS SOLD
    items: {
      type: [lineItemSchema],
      required: true,
    },

    subTotal: {
      type: Number,
      default: 0,
    },

    discount: {
      type: Number,
      default: 0,
    },

    tax: {
      type: Number,
      default: 0,
    },

    taxAmount: {
      type: Number,
      default: 0,
    },

    total: {
      type: Number,
      default: 0,
    },

    payments: {
      type: [paymentSchema],
      default: [],
    },

    paidAmount: {
      type: Number,
      default: 0,
    },

    dueAmount: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "unpaid",
    },

    // created by employee/admin
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /* ===============================
       LOCK SYSTEM
    ================================ */
    locked: {
      type: Boolean,
      default: false,
    },

    lockedAt: {
      type: Date,
      default: null,
    },

    /* ===============================
       PRINT TRACKING
    ================================ */
    printedAt: {
      type: Date,
      default: null,
    },

    printedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
