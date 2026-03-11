const express = require("express");
const router = express.Router();

const { protect, checkRole } = require("../middlewares/authMiddleware");

const {
  getMonthlyStats,
  getOrdersChartData,
  getMaterialUsage,
  getSummary,
  getOrderWiseProfit,
  getProductStockAgeing,
  getMaterialStockAgeing,
  getDeadStockProducts,
  getProductWiseProfit,
  getUpcomingDeliveries,
} = require("../controllers/analyticsController");

router.get("/summary", protect, getSummary);
router.get("/orders-chart", protect, getOrdersChartData);
router.get("/upcoming-deliveries", protect, getUpcomingDeliveries);

router.get("/monthly", protect, getMonthlyStats);

router.get("/materials/usage", protect, getMaterialUsage);
router.get(
  "/materials/ageing",
  protect,
  checkRole("admin"),
  getMaterialStockAgeing
);

router.get(
  "/products/ageing",
  protect,
  checkRole("admin"),
  getProductStockAgeing
);
router.get(
  "/products/dead-stock",
  protect,
  checkRole("admin"),
  getDeadStockProducts
);
router.get(
  "/product-profit",
  protect,
  checkRole("admin"),
  getProductWiseProfit
);

router.get("/order-profit", protect, getOrderWiseProfit);

module.exports = router;
