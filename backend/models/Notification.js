const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    toRole: { type: String },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    title: { type: String },
    body: { type: String },
    data: { type: Object, default: {} },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
