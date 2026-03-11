const productService = require("../services/productService");
const logger = require("../config/logger");

/* =====================================================
   ➕ CREATE PRODUCT (FROM MODAL)
===================================================== */
async function createProduct(req, res, next) {
  try {
    const result = await productService.createProduct(
      req.body,
      req.file,
      req.protocol,
      req.get("host"),
      req.user.role,
      req.user._id
    );

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    res.status(201).json({
      success: true,
      data: result,
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
    const products = await productService.getProducts(req.user.role);

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
    const io = req.app.get("io");
    const result = await productService.updateProduct(req.params.id, req.body, req.file, io);

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    res.json({ success: true, data: result });
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
    const result = await productService.deleteProduct(req.params.id);

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
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
