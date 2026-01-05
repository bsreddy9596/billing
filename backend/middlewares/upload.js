const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ==============================
// Ensure uploads folder exists
// ==============================
const uploadDir = path.join(__dirname, "../uploads/drawings");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ==============================
// Storage
// ==============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `drawing-${Date.now()}${ext}`);
  },
});

// ==============================
// File Filter (IMPORTANT)
// ==============================
const allowedTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp", // ✅ support modern images
];

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Unsupported image format. Use JPG, PNG, or WEBP only."),
      false
    );
  }
};

// ==============================
// Multer Config
// ==============================
module.exports = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // ✅ 5MB limit
  },
});
