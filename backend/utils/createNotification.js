const Notification = require("../models/Notification");

async function createNotification({
  io,
  toRole,
  toUser,
  title,
  body,
  data = {},
}) {
  try {
    const note = await Notification.create({
      toRole,
      toUser,
      title,
      body,
      data,
    });
    // emit to sockets
    // For simplicity we emit global; frontend can filter by role/user
    io.emit("notification", {
      id: note._id,
      toRole,
      toUser,
      title,
      body,
      data,
      createdAt: note.createdAt,
    });
  } catch (err) {
    console.error("createNotification error:", err.message);
  }
}

module.exports = createNotification;
