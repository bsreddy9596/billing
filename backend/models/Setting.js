const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    companyName: { type: String, default: "Furniture Studio" },
    companyAddress: { type: String, default: "" },
    companyPhone: { type: String, default: "" },
    taxPercent: { type: Number, default: 0 },
    invoicePrefix: { type: String, default: "INV" },
    currency: { type: String, default: "₹" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Setting", settingSchema);
