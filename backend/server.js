// =============================
// 📦 Imports
// =============================
require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const YAML = require("yamljs");
const swaggerUi = require("swagger-ui-express");
const morgan = require("morgan");
const logger = require("./config/logger");

const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middlewares/errorMiddleware");
const { ensureAdminExists } = require("./controllers/authController");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);

// =============================
// 📌 Connect DB
// =============================
connectDB()
  .then(() => {
    logger.info("✅ MongoDB Connected");
    ensureAdminExists();
  })
  .catch((err) => {
    logger.error("❌ MongoDB connection failed: %s", err.message);
    process.exit(1);
  });

// =============================
// 🔧 Middlewares
// =============================
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  morgan("tiny", { stream: { write: (msg) => logger.http(msg.trim()) } })
);

app.use("/uploads", express.static("uploads"));

// =============================
// 📘 Swagger
// =============================
try {
  const swaggerDocument = YAML.load("./swagger.yaml");
} catch (err) {
  logger.warn("⚠️ Swagger file missing: %s", err.message);
}

// =============================
// 📌 ROUTES
// =============================
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/materials", require("./routes/materialRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/invoices", require("./routes/invoiceRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));
app.use("/api/activity", require("./routes/activityRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/settings", require("./routes/settingsRoutes"));
app.use("/api/employees", require("./routes/employeeRoutes"));
app.use("/api/upload", require("./routes/upload"));

// ✅ >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// ⭐⭐ FIXED: PAYMENT ROUTE ADDED ⭐⭐
// ✅ This line was missing → caused 404 errors
app.use("/api/payments", require("./routes/paymentRoutes"));
// <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

// =============================
// ❌ Error Handlers
// =============================
app.use(notFound);
app.use(errorHandler);

// =============================
// 🔌 Socket.IO
// =============================
io.on("connection", (socket) => {
  logger.info(`🟢 Socket connected: ${socket.id}`);

  socket.on("disconnect", () => {
    logger.info(`🔴 Socket disconnected: ${socket.id}`);
  });
});

// =============================
// 🚀 Server Start
// =============================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
});
