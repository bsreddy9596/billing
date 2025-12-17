const { createLogger, format, transports } = require("winston");
const { combine, timestamp, printf, colorize } = format;

// 🧾 Custom log format
const logFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
});

// 🧠 Create logger instance
const logger = createLogger({
  level: "info", // default log level
  format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), logFormat),
  transports: [
    // ✅ Console logs (colored)
    new transports.Console({
      format: combine(colorize(), logFormat),
    }),

    // ✅ Save errors to separate file
    new transports.File({
      filename: "logs/error.log",
      level: "error",
    }),

    // ✅ All logs saved to combined file
    new transports.File({
      filename: "logs/combined.log",
    }),
  ],
});

// 🧩 Stream for morgan HTTP requests
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

module.exports = logger;
