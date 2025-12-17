const express = require("express");
const router = express.Router();

const upload = require("../middlewares/upload");
const { protect, checkRole } = require("../middlewares/authMiddleware");

const {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

// 👀 View products (Admin + Employee)
router.get("/", protect, checkRole("admin", "employee"), getProducts);

// ➕ Create product (Admin + Employee)
router.post(
  "/",
  protect,
  checkRole("admin", "employee"),
  upload.single("image"),
  createProduct
);

// ✏️ Update product (Admin only)
router.put(
  "/:id",
  protect,
  checkRole("admin"),
  upload.single("image"),
  updateProduct
);

// 🗑️ Delete product (Admin only)
router.delete("/:id", protect, checkRole("admin"), deleteProduct);

module.exports = router;
