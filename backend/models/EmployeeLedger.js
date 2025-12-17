const mongoose = require("mongoose");

const employeeLedgerSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: { type: String, enum: ["credit", "debit"], required: true },
    amount: { type: Number, required: true },
    note: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EmployeeLedger", employeeLedgerSchema);
