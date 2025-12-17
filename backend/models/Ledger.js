const mongoose = require("mongoose");

const ledgerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
    billId: { type: mongoose.Schema.Types.ObjectId, ref: "Bill" },
    type: { type: String, enum: ["credit", "debit"], required: true },
    amount: { type: Number, required: true },
    note: { type: String },
    paymentMode: {
      type: String,
      enum: ["cash", "card", "upi", "other"],
      default: "cash",
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ledgerSchema.index({ customerId: 1, createdAt: -1 });

module.exports = mongoose.model("Ledger", ledgerSchema);
