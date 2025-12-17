const Product = require("../models/Product");
const logger = require("../config/logger");

/* =====================================================
   🔔 LOW STOCK SOCKET HELPER
===================================================== */
function emitLowStock(io, product) {
  if (product.stockQty <= 3) {
    io.emit("low-stock", {
      productId: product._id,
      name: product.name,
      stockQty: product.stockQty,
      message: `⚠️ Low stock: ${product.name} (${product.stockQty})`,
    });
  }
}

/* =====================================================
   ➕ CREATE PRODUCT (FROM MODAL)
===================================================== */
async function createProduct(req, res, next) {
  try {
    const { name, brand, stockQty, buyPrice, sellPrice } = req.body;

    if (!name || !sellPrice) {
      return res.status(400).json({
        success: false,
        message: "Product name & sell price required",
      });
    }

    // 🛡️ ROLE BASED BUY PRICE
    const finalBuyPrice = req.user.role === "admin" ? Number(buyPrice || 0) : 0;

    // ✅ CORRECT IMAGE PATH (drawings + full URL)
    const image = req.file
      ? `${req.protocol}://${req.get("host")}/uploads/drawings/${
          req.file.filename
        }`
      : null;

    const product = await Product.create({
      name,
      brand,
      stockQty: Number(stockQty || 0),
      buyPrice: finalBuyPrice, // 🔒 employee → always 0
      sellPrice: Number(sellPrice),
      image,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (err) {
    next(err);
  }
}

/* =====================================================
   📦 GET ALL PRODUCTS (ROLE BASED)
===================================================== */
async function getProducts(req, res, next) {
  try {
    let products = await Product.find().sort({ createdAt: -1 }).lean();

    // 👀 Hide buyPrice for employee
    if (req.user.role !== "admin") {
      products = products.map(({ buyPrice, ...rest }) => rest);
    }

    res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (err) {
    next(err);
  }
}

/* =====================================================
   ✏️ UPDATE PRODUCT (FROM MODAL)
===================================================== */
async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;

    const update = {
      name: req.body.name,
      brand: req.body.brand,
      stockQty: Number(req.body.stockQty || 0),
      buyPrice: Number(req.body.buyPrice || 0),
      sellPrice: Number(req.body.sellPrice),
    };

    if (req.file) {
      update.image = `/uploads/${req.file.filename}`;
    }

    const product = await Product.findByIdAndUpdate(id, update, {
      new: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // 🔔 Low stock notify
    const io = req.app.get("io");
    emitLowStock(io, product);

    res.json({ success: true, data: product });
  } catch (err) {
    logger.error(`❌ updateProduct: ${err.message}`);
    next(err);
  }
}

/* =====================================================
   🗑️ DELETE PRODUCT
===================================================== */
async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (err) {
    logger.error(`❌ deleteProduct: ${err.message}`);
    next(err);
  }
}

/* =====================================================
   📤 EXPORTS
===================================================== */
module.exports = {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
};
