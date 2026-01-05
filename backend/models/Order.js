const mongoose = require("mongoose");

/* MATERIALS */
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
    savedShapes: mongoose.Schema.Types.Mixed,
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

/* PAYMENT */
const paymentSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["advance", "payment"], required: true },
    amount: { type: Number, required: true },
    method: { type: String, default: "cash" },
    note: String,
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    receiptId: { type: mongoose.Schema.Types.ObjectId, ref: "Receipt" },
  },
  { timestamps: true }
);

/* ORDER */
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

    expenses: [expenseSchema],
    payments: [paymentSchema],

    invoiceNumber: String,
    remarks: String,

    expectedDelivery: Date,
    actualDelivery: Date,

    advanceAmount: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },

    measurementUnit: {
      type: String,
      enum: ["cm", "inch", "feet", "meter"],
      default: "cm",
    },

    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/* TOTALS */
orderSchema.methods.recalculateTotals = function () {
  const expenses = this.expenses.reduce((s, e) => s + e.amount, 0);
  const paid = this.payments.reduce((s, p) => s + p.amount, 0);
  const advance = this.payments
    .filter((p) => p.type === "advance")
    .reduce((s, p) => s + p.amount, 0);

  const sale = this.saleAmount || this.finalSalePrice || 0;
  const due = Math.max(0, sale - paid);

  this.advanceAmount = advance;
  this.dueAmount = due;
  this.profit =
    sale - (this.totalMaterialCost || 0) - expenses - (this.workCharge || 0);
};

/* PRE SAVE */
orderSchema.pre("save", function (next) {
  this.recalculateTotals();
  next();
});

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ customerPhone: 1 });

module.exports = mongoose.model("Order", orderSchema);
