const Bill = require("../models/Bill");
const Order = require("../models/Order");
const Ledger = require("../models/Ledger");
const Transaction = require("../models/Transaction");
const logger = require("../config/logger");

/* -------------------------------------------------------------------------- */
/* 🧾 Create New Bill (Manual / From Order)                                   */
/* -------------------------------------------------------------------------- */
exports.createBill = async (req, res, next) => {
  try {
    const { customerId, items, totalAmount, paymentStatus, orderId } = req.body;

    if (!items?.length || !totalAmount)
      return res
        .status(400)
        .json({ success: false, message: "Items and totalAmount required" });

    const bill = await Bill.create({
      userId: req.user._id,
      customerId: customerId || null,
      items,
      totalAmount,
      paymentStatus: paymentStatus || "due",
      orderId: orderId || null,
    });

    // Ledger entry - debit
    await Ledger.create({
      userId: req.user._id,
      customerId,
      type: "debit",
      amount: totalAmount,
      note: "Bill generated",
      billId: bill._id,
    });

    // Create credit transaction only if fully paid (avoid duplicates)
    if (paymentStatus === "paid") {
      const exists = await Transaction.findOne({
        billId: bill._id,
        type: "credit",
      });
      if (!exists) {
        await Transaction.create({
          userId: req.user._id,
          customerId,
          type: "credit",
          amount: totalAmount,
          note: "Payment received",
          billId: bill._id,
        });
      }
    }

    // If linked to order → mark as billed
    if (orderId) {
      await Order.findByIdAndUpdate(orderId, { status: "billed" });
    }

    logger.info(`🧾 Bill created successfully by ${req.user._id}`);
    res.status(201).json({ success: true, data: bill });
  } catch (err) {
    logger.error(`❌ Create Bill Error: ${err.message}`);
    next(err);
  }
};

/* -------------------------------------------------------------------------- */
/* 📋 Get All Bills for Logged-in User                                        */
/* -------------------------------------------------------------------------- */
exports.getBills = async (req, res, next) => {
  try {
    const bills = await Bill.find({ userId: req.user._id })
      .populate("customerId", "name phone")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, count: bills.length, data: bills });
  } catch (err) {
    logger.error(`❌ Get Bills Error: ${err.message}`);
    next(err);
  }
};

/* -------------------------------------------------------------------------- */
/* 🔍 Get Single Bill Details                                                 */
/* -------------------------------------------------------------------------- */
exports.getBillById = async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate("customerId", "name phone")
      .lean();

    if (!bill)
      return res
        .status(404)
        .json({ success: false, message: "Bill not found" });

    res.json({ success: true, data: bill });
  } catch (err) {
    logger.error(`❌ Get Bill By ID Error: ${err.message}`);
    next(err);
  }
};

/* -------------------------------------------------------------------------- */
/* 🪄 Import Order Details into Bill                                          */
/* -------------------------------------------------------------------------- */
exports.importOrderToBill = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    if (!orderId)
      return res
        .status(400)
        .json({ success: false, message: "Order ID is required" });

    const order = await Order.findById(orderId)
      .populate("customerId", "name phone")
      .lean();

    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    const items = (order.items || []).map((i) => ({
      name: i.name,
      quantity: i.quantity,
      price: i.price,
      total: i.quantity * i.price,
    }));

    const data = {
      orderId: order._id,
      customerId: order.customerId?._id || null,
      items,
      totalAmount: order.totalAmount || 0,
    };

    res.json({ success: true, data });
  } catch (err) {
    logger.error(`❌ Import Order To Bill Error: ${err.message}`);
    next(err);
  }
};
