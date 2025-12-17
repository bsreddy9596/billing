const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
    },
    amount: { type: Number, required: true },
    method: {
      type: String,
      enum: ["cash", "card", "upi", "other"],
      default: "cash",
    },
    note: { type: String },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
