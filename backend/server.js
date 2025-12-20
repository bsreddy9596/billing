require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const YAML = require("yamljs");
const morgan = require("morgan");

const logger = require("./config/logger");
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middlewares/errorMiddleware");
const { ensureAdminExists } = require("./controllers/authController");

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://billing-qahs.vercel.app", // Admin App
  "https://furniturepro.vercel.app",
  "https://billing-psi-two.vercel.app", // ✅ Employee App (IMPORTANT)
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
};

const io = new Server(server, {
  cors: corsOptions,
  transports: ["websocket", "polling"],
});

app.set("io", io);

connectDB()
  .then(() => {
    logger.info("MongoDB Connected");
    ensureAdminExists();
  })
  .catch((err) => {
    logger.error("MongoDB connection failed: %s", err.message);
    process.exit(1);
  });

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  morgan("tiny", {
    stream: { write: (msg) => logger.http(msg.trim()) },
  })
);

app.use("/uploads", express.static("uploads"));

try {
  YAML.load("./swagger.yaml");
} catch {
  logger.warn("Swagger file missing");
}

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
app.use("/api/payments", require("./routes/paymentRoutes"));

app.use(notFound);
app.use(errorHandler);

io.on("connection", (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
  socket.on("disconnect", () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
