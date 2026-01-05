const mongoose = require("mongoose");

const receiptSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    receiptNo: {
      type: String,
      unique: true,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    mode: {
      type: String,
      enum: ["cash", "upi", "bank"],
      default: "cash",
    },

    note: String,

    // ❌ NOT REQUIRED ANYMORE
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    paidTillNow: {
      type: Number,
      default: 0,
    },

    balanceDue: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Receipt", receiptSchema);
