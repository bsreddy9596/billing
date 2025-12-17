const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    address: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    totalDue: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// 🔄 Auto-calculate balance
customerSchema.pre("save", function (next) {
  this.balance = (this.totalDue || 0) - (this.totalPaid || 0);
  next();
});

module.exports = mongoose.model("Customer", customerSchema);
