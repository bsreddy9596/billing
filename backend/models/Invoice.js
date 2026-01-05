const mongoose = require("mongoose");

/* ===============================
   LINE ITEM (PRODUCT SALE)
================================ */
const lineItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },

    description: {
      type: String,
      required: true,
      trim: true,
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
      default: "Payment", // Advance / Payment
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
      enum: ["cash", "upi", "bank"],
      default: "cash",
    },

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
    /* 🔥 INVOICE TYPE */
    invoiceType: {
      type: String,
      enum: ["order", "product"],
      required: true,
      index: true,
    },

    /* 🔗 ORDER LINK */
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },

    invoiceNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    /* 👤 CUSTOMER */
    customerName: {
      type: String,
      trim: true,
      required: true,
    },

    customerPhone: {
      type: String,
      trim: true,
    },

    customerAddress: {
      type: String,
      trim: true,
    },

    /* 🛒 ITEMS */
    items: {
      type: [lineItemSchema],
      required: true,
    },

    /* 💰 TOTALS */
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

    /* 💳 PAYMENTS */
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
      index: true,
    },

    /* 👤 CREATED BY */
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /* ✏️ LAST UPDATED BY (PAYMENT ADD) */
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    /* 💳 LAST PAYMENT TRACK */
    lastPaymentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    lastPaymentAt: {
      type: Date,
      default: null,
    },

    /* 🔒 LOCK SYSTEM */
    locked: {
      type: Boolean,
      default: false,
    },

    lockedAt: {
      type: Date,
      default: null,
    },

    /* 🖨 PRINT TRACKING */
    printedAt: {
      type: Date,
      default: null,
    },

    printedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    /* ❌ CANCEL SUPPORT */
    cancelled: {
      type: Boolean,
      default: false,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
