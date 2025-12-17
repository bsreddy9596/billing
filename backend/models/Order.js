// models/Order.js
const mongoose = require("mongoose");

/* MATERIALS USED */
const materialUsedSchema = new mongoose.Schema(
  {
    materialId: { type: mongoose.Schema.Types.ObjectId, ref: "Material" },
    name: String,
    quantity: { type: Number, required: true },
    unit: { type: String, default: "pcs" },
    note: String,
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    usedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/* DRAWINGS */
const drawingSchema = new mongoose.Schema(
  {
    itemType: {
      type: String,
      enum: ["SOFA", "L-SHAPE", "BED", "CHAIR", "TABLE", "CUSTOM"],
      required: true,
    },
    name: String,
    notes: { type: [String], default: [] },
    drawingUrl: String,
    specs: { type: [String], default: [] },
    savedShapes: { type: mongoose.Schema.Types.Mixed, default: {} },
    measurements: {
      width: Number,
      height: Number,
      depth: Number,
      armHeight: Number,
      other: String,
    },
  },
  { _id: false }
);

/* EXPENSE */
const expenseSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["labour", "transport", "misc", "other"],
      required: true,
    },
    label: String,
    amount: { type: Number, required: true },
    note: String,
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/* LEGACY PAYMENT (kept for backward compatibility) */
const paymentSchema = new mongoose.Schema({
  type: { type: String, enum: ["advance", "payment"], required: true },
  amount: { type: Number, required: true },
  note: String,
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  paidAt: { type: Date, default: Date.now },
});

/* MAIN ORDER SCHEMA */
const orderSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },

    customerName: String,
    customerPhone: String,
    customerAddress: { type: String, default: "" },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    confirmedAt: Date,

    drawings: [drawingSchema],
    materialsUsed: [materialUsedSchema],

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "ready_for_delivery",
        "delivered",
        "completed",
        "rejected",
      ],
      default: "pending",
    },

    totalMaterialCost: { type: Number, default: 0 },
    saleAmount: { type: Number, default: 0 },
    finalSalePrice: { type: Number, default: 0 },

    workCharge: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },

    // Keep these for backwards compatibility (existing documents)
    advanceAmount: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },

    expenses: [expenseSchema],
    payments: [paymentSchema], // legacy — we keep it but will prefer Invoice.payments in runtime

    invoiceNumber: String,
    remarks: String,

    expectedDelivery: Date,
    actualDelivery: Date,

    measurementUnit: {
      type: String,
      enum: ["cm", "inch", "feet", "meter"],
      default: "cm",
    },

    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/* CALCULATE INTERNAL TOTALS (local only) */
orderSchema.methods.calcTotalsLocal = function () {
  const totalExpenses = (this.expenses || []).reduce(
    (sum, e) => sum + (e.amount || 0),
    0
  );
  const totalPayments = (this.payments || []).reduce(
    (sum, p) => sum + (p.amount || 0),
    0
  );
  const advance = (this.payments || [])
    .filter((p) => p.type === "advance")
    .reduce((s, p) => s + (p.amount || 0), 0);

  const sale = this.saleAmount || this.finalSalePrice || 0;
  const due = Math.max(0, sale - totalPayments);

  const profit =
    sale -
    (this.totalMaterialCost || 0) -
    totalExpenses -
    (this.workCharge || 0);

  return {
    totalExpenses,
    totalPayments,
    totalMaterials: this.totalMaterialCost || 0,
    saleAmount: sale,
    paid: totalPayments,
    advance,
    due,
    profit,
  };
};

orderSchema.methods.syncWithInvoice = async function () {
  try {
    // lazy require
    const Invoice = mongoose.models.Invoice || require("./Invoice");

    const inv = await Invoice.findOne({ orderId: this._id }).lean();
    if (!inv) {
      // no invoice → fall back to local/order payments
      const locals = this.calcTotalsLocal();
      this.advanceAmount = locals.advance;
      this.dueAmount = locals.due;
      this.profit = locals.profit;
      return { source: "order", totals: locals };
    }

    // invoice exists → use it
    const paidAmount = Number(
      inv.paidAmount ||
        (Array.isArray(inv.payments)
          ? inv.payments.reduce((s, p) => s + (p.amount || 0), 0)
          : 0)
    );
    const dueAmount = Math.max(0, Number(inv.total || 0) - paidAmount);

    const advance = (inv.payments || [])
      .filter((p) => (p.label || "").toLowerCase().includes("advance"))
      .reduce((s, p) => s + (p.amount || 0), 0);

    // update order fields (not overwriting saleAmount/profit except recompute profit)
    this.advanceAmount = advance;
    this.dueAmount = dueAmount;

    // recompute profit in same way as calcTotalsLocal but using sale from order
    const totalExpenses = (this.expenses || []).reduce(
      (sum, e) => sum + (e.amount || 0),
      0
    );
    const sale = this.saleAmount || this.finalSalePrice || 0;
    this.profit =
      sale -
      (this.totalMaterialCost || 0) -
      totalExpenses -
      (this.workCharge || 0);

    return { source: "invoice", paidAmount, dueAmount, advance };
  } catch (err) {
    // on any error fallback to local calc
    const locals = this.calcTotalsLocal();
    this.advanceAmount = locals.advance;
    this.dueAmount = locals.due;
    this.profit = locals.profit;
    return { source: "error", error: err.message, totals: locals };
  }
};

/**
 * pre-save hook:
 * - synchronizes advance/due/profit from Invoice (if present)
 * - safe: if Invoice lookup fails, falls back to local payments
 */
orderSchema.pre("save", async function (next) {
  try {
    await this.syncWithInvoice();
    next();
  } catch (err) {
    // still allow save even if sync fails
    next();
  }
});

/* utility static: sync many orders (useful for migration / bulk repair) */
orderSchema.statics.syncAllFromInvoices = async function (opts = {}) {
  const Order = this;
  const limit = opts.limit || 0;
  const query = opts.query || {};
  const cursor = Order.find(query).cursor();
  let count = 0;
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    // run sync but avoid too long runs if limit set
    await doc.syncWithInvoice();
    await doc.save();
    count++;
    if (limit > 0 && count >= limit) break;
  }
  return count;
};

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ customerPhone: 1 });

module.exports = mongoose.model("Order", orderSchema);
