const Order = require("../models/Order");
const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const Material = require("../models/Material");

class AnalyticsService {
    async getMonthlyStats() {
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

        return stats.map((s) => ({
            month: `${s._id.month}/${s._id.year}`,
            revenue: s.revenue,
            revenue: s.revenue,
            paid: s.paid,
        }));
    }

    async getUpcomingDeliveries() {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const in5Days = new Date();
        in5Days.setDate(in5Days.getDate() + 5);
        in5Days.setHours(23, 59, 59, 999);

        // 1. Check for deliveries within next 5 days (including today and overdue past deliveries not delivered)
        const next5DaysDeliveries = await Order.find({
            expectedDelivery: { $lte: in5Days },
            status: { $nin: ["delivered", "completed", "rejected", "archived"] },
            isArchived: false,
        })
            .sort({ expectedDelivery: 1 })
            .lean();

        if (next5DaysDeliveries.length > 0) {
            return next5DaysDeliveries;
        }

        // 2. If none, show nearest upcoming
        const upcoming = await Order.find({
            expectedDelivery: { $gt: in5Days },
            status: { $nin: ["delivered", "completed", "rejected"] },
            isArchived: false,
        })
            .sort({ expectedDelivery: 1 })
            .limit(5)
            .lean();

        return upcoming;
    }

    async getMaterialUsage() {
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

        return usage;
    }

    async getSummary() {
        const [orders, invoices, products, materials] = await Promise.all([
            Order.find({}).lean(),
            Invoice.find({}).lean(),
            Product.find({}).lean(),
            Material.find({}).lean(),
        ]);

        /* ================= INIT ================= */
        let ordersRevenue = 0;
        let orderPaidAmount = 0;
        let orderDueAmount = 0;
        let orderProfit = 0;
        let orderPendingAmount = 0;

        let productsRevenue = 0;
        let productPaidAmount = 0;
        let productDueAmount = 0;
        let productProfit = 0;
        let salesQty = 0;

        /* ===== ORDER STATUS COUNTS ===== */
        let pendingOrders = 0;
        let confirmedOrders = 0;
        let processingOrders = 0;
        let readyForDeliveryOrders = 0;

        let totalExpenses = 0;
        let ordersMaterialCost = 0;

        /* ================= PRODUCT MAP ================= */
        const productMap = {};
        products.forEach((p) => {
            productMap[p._id.toString()] = p;
        });

        /* ================= ORDERS ================= */
        orders.forEach((o) => {
            const sale = Number(o.saleAmount || 0);
            const materialCost = Number(o.totalMaterialCost || 0);
            const expenses = Array.isArray(o.expenses)
                ? o.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)
                : 0;

            ordersRevenue += sale;
            orderProfit += sale - (materialCost + expenses);
            totalExpenses += expenses;
            ordersMaterialCost += materialCost;

            /* PENDING ORDERS VALUE */
            if (["pending", "confirmed", "processing", "ready", "ready_for_delivery"].includes(o.status)) {
                orderPendingAmount += sale;
            }

            /* ORDER STATUS */
            switch (o.status) {
                case "pending":
                    pendingOrders++;
                    break;
                case "confirmed":
                    confirmedOrders++;
                    break;
                case "processing":
                    processingOrders++;
                    break;
                case "ready":
                case "ready_for_delivery":
                    readyForDeliveryOrders++;
                    break;
                default:
                    break;
            }
        });

        /* ================= INVOICES ================= */
        invoices.forEach((inv) => {
            /* ===== ORDER INVOICES ===== */
            if (inv.invoiceType === "order") {
                orderPaidAmount += Number(inv.paidAmount || 0);
                orderDueAmount += Number(inv.dueAmount || 0);
            }

            /* ===== PRODUCT INVOICES ===== */
            let hasProductItems = false;

            (inv.items || []).forEach((it) => {
                if (!it.productId) return;

                hasProductItems = true;

                const qty = Number(it.qty || 0);
                const rate = Number(it.rate || 0);

                productsRevenue += qty * rate;
                salesQty += qty;

                const product = productMap[it.productId.toString()];
                if (product) {
                    const buy = Number(product.buyPrice || 0);
                    productProfit += (rate - buy) * qty;
                }
            });

            if (hasProductItems) {
                productPaidAmount += Number(inv.paidAmount || 0);
                productDueAmount += Number(inv.dueAmount || 0);
            }
        });

        /* ================= INVENTORY ================= */
        const productStockValue = products.reduce(
            (s, p) => s + Number(p.stockQty || 0) * Number(p.buyPrice || 0),
            0
        );

        const materialStockValue = materials.reduce(
            (s, m) => s + Number(m.availableQty || 0) * Number(m.costPerUnit || 0),
            0
        );

        /* ================= RESPONSE ================= */
        return {
            /* ORDERS */
            totalOrders: orders.length,
            pendingOrders,
            confirmedOrders,
            processingOrders,
            readyForDeliveryOrders,

            ordersRevenue: Math.round(ordersRevenue),
            paidAmount: Math.round(orderPaidAmount),
            dueAmount: Math.round(orderDueAmount),
            orderPendingAmount: Math.round(orderPendingAmount),
            orderProfit: Math.round(orderProfit),
            totalExpenses: Math.round(totalExpenses),
            ordersMaterialCost: Math.round(ordersMaterialCost),
            availableBalance: Math.round((orderPaidAmount + productPaidAmount) - totalExpenses),

            /* PRODUCTS */
            productsRevenue: Math.round(productsRevenue),
            productPaidAmount: Math.round(productPaidAmount),
            productDueAmount: Math.round(productDueAmount),
            productProfit: Math.round(productProfit),
            salesQty,

            /* INVENTORY */
            productStockValue: Math.round(productStockValue),
            materialStockValue: Math.round(materialStockValue),
        };
    }

    async getOrderWiseProfit() {
        const orders = await Order.find(
            {},
            {
                customerName: 1,
                saleAmount: 1,
                totalMaterialCost: 1,
                expenses: 1,
            }
        ).lean();

        const data = orders
            .map((o) => {
                const orderValue = Number(o.saleAmount || 0);
                const materialCost = Number(o.totalMaterialCost || 0);

                // ✅ CORRECT: SUM EXPENSES ARRAY
                const expenses = Array.isArray(o.expenses)
                    ? o.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0)
                    : 0;

                const profit = orderValue - (materialCost + expenses);

                return {
                    customerName: o.customerName || "General",
                    orderValue: Math.round(orderValue),
                    materialCost: Math.round(materialCost),
                    expenses: Math.round(expenses), // ✅ NOW SHOWS ₹2000
                    profit: Math.round(profit),
                };
            })
            .filter((o) => o.orderValue > 0);

        return data;
    }

    async getProductStockAgeing() {
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
        return data;
    }

    async getDeadStockProducts() {
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
        return data;
    }

    async getMaterialStockAgeing() {
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
        return data;
    }

    async getProductWiseProfit() {
        const [orders, invoices, products] = await Promise.all([
            Order.find({}).lean(),
            Invoice.find({}).lean(),
            Product.find({}).lean(),
        ]);

        // 🔑 Product Map
        const productMap = {};
        products.forEach((p) => {
            productMap[p._id.toString()] = {
                name: p.name,
                buyPrice: Number(p.buyPrice || 0),
            };
        });

        // 🔢 Aggregation Map
        const agg = {};

        const addProduct = (productId, qty, sellRate) => {
            if (!productMap[productId]) return;

            if (!agg[productId]) {
                agg[productId] = {
                    name: productMap[productId].name,
                    quantity: 0,
                    revenue: 0,
                    cost: 0,
                    profit: 0,
                };
            }

            const buy = productMap[productId].buyPrice;

            agg[productId].quantity += qty;
            agg[productId].revenue += sellRate * qty;
            agg[productId].cost += buy * qty;
            agg[productId].profit += (sellRate - buy) * qty;
        };

        /* ================= ORDERS ================= */
        orders.forEach((o) => {
            (o.items || []).forEach((it) => {
                if (!it.productId) return;

                addProduct(
                    it.productId.toString(),
                    Number(it.qty || 0),
                    Number(it.rate || it.price || 0)
                );
            });
        });

        /* ================= DIRECT INVOICES ================= */
        invoices.forEach((inv) => {
            if (inv.orderId) return; // only direct invoices

            (inv.items || []).forEach((it) => {
                if (!it.productId) return;

                addProduct(
                    it.productId.toString(),
                    Number(it.qty || 0),
                    Number(it.rate || 0)
                );
            });
        });

        /* ================= FINAL ARRAY ================= */
        const productsData = Object.values(agg).sort(
            (a, b) => b.quantity - a.quantity
        );

        /* ================= SUMMARY ================= */
        const summary = productsData.reduce(
            (acc, p) => {
                acc.revenue += p.revenue;
                acc.cost += p.cost;
                acc.profit += p.profit;
                acc.quantity += p.quantity;
                return acc;
            },
            { revenue: 0, cost: 0, profit: 0, quantity: 0 }
        );

        return {
            summary: {
                revenue: Math.round(summary.revenue),
                cost: Math.round(summary.cost),
                profit: Math.round(summary.profit),
                quantity: summary.quantity,
            },
            products: productsData.map((p) => ({
                ...p,
                revenue: Math.round(p.revenue),
                cost: Math.round(p.cost),
                profit: Math.round(p.profit),
            })),
        };
    }

    async getOrdersChartData(filter) {
        let groupBy = {};
        const now = new Date();
        let matchDate = new Date();

        switch (filter) {
            case "day":
                matchDate = new Date(0); // Fetch all data
                groupBy = {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                    day: { $dayOfMonth: "$createdAt" },
                };
                break;
            case "week":
                matchDate = new Date(0);
                groupBy = {
                    year: { $year: "$createdAt" },
                    week: { $isoWeek: "$createdAt" },
                };
                break;
            case "month":
            default:
                matchDate = new Date(0);
                groupBy = {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                };
                break;
            case "year":
                matchDate = new Date(0);
                groupBy = {
                    year: { $year: "$createdAt" },
                };
                break;
        }

        const data = await Order.aggregate([
            { $match: { createdAt: { $gte: matchDate }, isArchived: false } },
            {
                $group: {
                    _id: groupBy,
                    totalOrders: { $sum: 1 },
                    revenue: { $sum: { $cond: [{ $gt: ["$saleAmount", 0] }, "$saleAmount", "$finalSalePrice"] } }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.week": 1, "_id.day": 1 } }
        ]);

        return data.map(d => {
            let label = "";
            if (filter === "day") label = `${String(d._id.day).padStart(2, '0')}/${String(d._id.month).padStart(2, '0')}`;
            else if (filter === "week") label = `W${d._id.week} ${d._id.year}`;
            else if (filter === "year") label = `${d._id.year}`;
            else {
                const map = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                label = `${map[d._id.month - 1]} ${d._id.year}`;
            }
            return {
                label,
                orders: d.totalOrders,
                revenue: Math.round(d.revenue || 0)
            };
        });
    }
}

module.exports = new AnalyticsService();
