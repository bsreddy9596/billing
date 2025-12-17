const mongoose = require("mongoose");

const materialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    unit: { type: String, default: "pcs" },
    costPerUnit: { type: Number, default: 0 },
    availableQty: { type: Number, default: 0 },
    minThreshold: { type: Number, default: 5 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Material", materialSchema);
