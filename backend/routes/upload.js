// routes/upload.js
const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload"); // <-- Your multer config file
const path = require("path");

// 📌 UPLOAD SINGLE DRAWING
router.post("/", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // URL served by express.static("/uploads")
    const fileUrl = `/uploads/drawings/${req.file.filename}`;

    return res.status(200).json({
      message: "Upload successful",
      url: fileUrl,
    });
  } catch (err) {
    console.error("Upload Error:", err);
    return res.status(500).json({ message: "Upload failed" });
  }
});

module.exports = router;
