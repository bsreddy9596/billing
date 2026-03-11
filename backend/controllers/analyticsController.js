const analyticsService = require("../services/analyticsService");
const logger = require("../config/logger");

async function getMonthlyStats(req, res, next) {
  try {
    const data = await analyticsService.getMonthlyStats();
    res.json({ success: true, data });
  } catch (err) {
    logger.error(`getMonthlyStats: ${err.message}`);
    next(err);
  }
}

async function getOrdersChartData(req, res, next) {
  try {
    const filter = req.query.filter || 'month';
    const data = await analyticsService.getOrdersChartData(filter);
    res.json({ success: true, data });
  } catch (err) {
    logger.error(`getOrdersChartData: ${err.message}`);
    next(err);
  }
}

async function getMaterialUsage(req, res, next) {
  try {
    const data = await analyticsService.getMaterialUsage();
    res.json({ success: true, data });
  } catch (err) {
    logger.error(`getMaterialUsage: ${err.message}`);
    next(err);
  }
}

async function getSummary(req, res, next) {
  try {
    const data = await analyticsService.getSummary();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getOrderWiseProfit(req, res, next) {
  try {
    const data = await analyticsService.getOrderWiseProfit();
    res.json({ success: true, data });
  } catch (err) {
    console.error("getOrderWiseProfit ERROR:", err);
    next(err);
  }
}

async function getProductStockAgeing(req, res, next) {
  try {
    const data = await analyticsService.getProductStockAgeing();
    res.json({ success: true, data });
  } catch (err) {
    logger.error(`getProductStockAgeing: ${err.message}`);
    next(err);
  }
}

async function getDeadStockProducts(req, res, next) {
  try {
    const data = await analyticsService.getDeadStockProducts();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getMaterialStockAgeing(req, res, next) {
  try {
    const data = await analyticsService.getMaterialStockAgeing();
    res.json({ success: true, data });
  } catch (err) {
    logger.error(`getMaterialStockAgeing: ${err.message}`);
    next(err);
  }
}

async function getProductWiseProfit(req, res, next) {
  try {
    const data = await analyticsService.getProductWiseProfit();
    res.json({ success: true, data });
  } catch (err) {
    logger.error(`getProductWiseProfit: ${err.message}`);
    next(err);
  }
}

async function getUpcomingDeliveries(req, res, next) {
  try {
    const data = await analyticsService.getUpcomingDeliveries();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
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
};
