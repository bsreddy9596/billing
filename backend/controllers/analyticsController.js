const Order = require("../models/Order");
const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const Material = require("../models/Material");
const logger = require("../config/logger");

async function getMonthlyStats(req, res, next) {
  try {
    const stats = await Invoice.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          revenue: { $sum: "$total" },
          paid: { $sum: "$paidAmount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    res.json({
      success: true,
      data: stats.map((s) => ({
        month: `${s._id.month}/${s._id.year}`,
        revenue: s.revenue,
        paid: s.paid,
      })),
    });
  } catch (err) {
    logger.error(`getMonthlyStats: ${err.message}`);
    next(err);
  }
}

async function getMaterialUsage(req, res, next) {
  try {
    const usage = await Order.aggregate([
      { $unwind: "$materialsUsed" },
      {
        $group: {
          _id: "$materialsUsed.materialId",
          totalQty: { $sum: "$materialsUsed.quantity" },
        },
      },
      {
        $lookup: {
          from: "materials",
          localField: "_id",
          foreignField: "_id",
          as: "material",
        },
      },
      { $unwind: "$material" },
      {
        $project: {
          name: "$material.name",
          unit: "$material.unit",
          totalQty: 1,
        },
      },
      { $sort: { totalQty: -1 } },
    ]);

    res.json({ success: true, data: usage });
  } catch (err) {
    logger.error(`getMaterialUsage: ${err.message}`);
    next(err);
  }
}
async function getSummary(req, res, next) {
  try {
    console.log("🔥 SUMMARY API HIT – FINAL FIX");

    const [orders, invoices, products, materials] = await Promise.all([
      Order.find({}).lean(),
      Invoice.find({}).lean(),
      Product.find({}).lean(),
      Material.find({}).lean(),
    ]);

    let ordersRevenue = 0;
    let salesQty = 0;
    let paidAmount = 0;
    let dueAmount = 0;
    let profit = 0;

    // 🔑 Product Map
    const productMap = {};
    products.forEach((p) => {
      productMap[p._id.toString()] = p;
    });

    /* ================= ORDERS ================= */
    orders.forEach((o) => {
      ordersRevenue += Number(o.saleAmount || o.finalSalePrice || 0);
      salesQty += (o.items || []).reduce((s, i) => s + Number(i.qty || 0), 0);
      profit += Number(o.profit || 0);
    });

    /* ================= INVOICES ================= */
    invoices.forEach((inv) => {
      const isDirect = !inv.orderId;

      if (isDirect) {
        ordersRevenue += Number(inv.total || 0);
      }

      paidAmount += Number(inv.paidAmount || 0);
      dueAmount += Number(inv.dueAmount || 0);

      if (isDirect) {
        (inv.items || []).forEach((it) => {
          if (!it.productId) return; // ❌ skip broken data

          const product = productMap[it.productId.toString()];
          if (!product) return;

          const qty = Number(it.qty || 0);
          const sell = Number(it.rate || 0);
          const buy = Number(product.buyPrice || 0);

          salesQty += qty;
          profit += (sell - buy) * qty;
        });
      }
    });

    /* ================= INVENTORY ================= */
    const productStockValue = products.reduce(
      (s, p) => s + (p.stockQty || 0) * (p.buyPrice || 0),
      0
    );

    const materialStockValue = materials.reduce(
      (s, m) => s + (m.availableQty || 0) * (m.costPerUnit || 0),
      0
    );

    res.json({
      success: true,
      data: {
        totalOrders: orders.length,
        ordersRevenue,
        salesQty,
        paidAmount,
        dueAmount,
        productStockValue,
        materialStockValue,
        profit: Math.round(profit),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getOrderWiseProfit(req, res, next) {
  try {
    const orders = await Order.find(
      {},
      {
        customerName: 1,
        saleAmount: 1,
        totalMaterialCost: 1,
        expenses: 1,
      }
    ).lean();

    const data = orders.map((o) => {
      const orderValue = Number(o.saleAmount || 0);
      const materialCost = Number(o.totalMaterialCost || 0);
      const expenses = Number(o.expenses?.total || 0);

      return {
        customerName: o.customerName || "General",
        orderValue,
        materialCost,
        expenses,
        profit: orderValue - (materialCost + expenses),
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    logger.error(`getOrderWiseProfit: ${err.message}`);
    next(err);
  }
}

async function getProductStockAgeing(req, res, next) {
  try {
    const data = await Product.aggregate([
      { $match: { stockQty: { $gt: 0 } } },
      {
        $addFields: {
          ageingDays: {
            $dateDiff: {
              startDate: { $ifNull: ["$updatedAt", "$createdAt"] },
              endDate: new Date(),
              unit: "day",
            },
          },
        },
      },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $lte: ["$ageingDays", 30] }, then: "0-30 days" },
                {
                  case: {
                    $and: [
                      { $gt: ["$ageingDays", 30] },
                      { $lte: ["$ageingDays", 60] },
                    ],
                  },
                  then: "31-60 days",
                },
                {
                  case: {
                    $and: [
                      { $gt: ["$ageingDays", 60] },
                      { $lte: ["$ageingDays", 90] },
                    ],
                  },
                  then: "61-90 days",
                },
              ],
              default: "90+ days",
            },
          },
          totalQty: { $sum: "$stockQty" },
        },
      },
    ]);

    res.json({ success: true, data });
  } catch (err) {
    logger.error(`getProductStockAgeing: ${err.message}`);
    next(err);
  }
}

async function getDeadStockProducts(req, res, next) {
  try {
    const data = await Product.aggregate([
      { $match: { stockQty: { $gt: 0 } } },
      {
        $addFields: {
          ageingDays: {
            $dateDiff: {
              startDate: { $ifNull: ["$updatedAt", "$createdAt"] },
              endDate: new Date(),
              unit: "day",
            },
          },
        },
      },
      { $match: { ageingDays: { $gte: 90 } } },
      {
        $project: {
          name: 1,
          stockQty: 1,
          ageingDays: 1,
          stockValue: { $multiply: ["$stockQty", "$buyPrice"] },
        },
      },
      { $sort: { ageingDays: -1 } },
    ]);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getMaterialStockAgeing(req, res, next) {
  try {
    const data = await Material.aggregate([
      { $match: { availableQty: { $gt: 0 } } },
      {
        $addFields: {
          ageingDays: {
            $dateDiff: {
              startDate: { $ifNull: ["$updatedAt", "$createdAt"] },
              endDate: new Date(),
              unit: "day",
            },
          },
        },
      },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $lte: ["$ageingDays", 30] }, then: "0-30 days" },
                {
                  case: {
                    $and: [
                      { $gt: ["$ageingDays", 30] },
                      { $lte: ["$ageingDays", 60] },
                    ],
                  },
                  then: "31-60 days",
                },
                {
                  case: {
                    $and: [
                      { $gt: ["$ageingDays", 60] },
                      { $lte: ["$ageingDays", 90] },
                    ],
                  },
                  then: "61-90 days",
                },
              ],
              default: "90+ days",
            },
          },
          totalQty: { $sum: "$availableQty" },
        },
      },
    ]);

    res.json({ success: true, data });
  } catch (err) {
    logger.error(`getMaterialStockAgeing: ${err.message}`);
    next(err);
  }
}

module.exports = {
  getMonthlyStats,
  getMaterialUsage,
  getSummary,
  getOrderWiseProfit,
  getProductStockAgeing,
  getMaterialStockAgeing,
  getDeadStockProducts,
};
