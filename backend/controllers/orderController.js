console.log("🔥 orderController LOADED");

const mongoose = require("mongoose");
const Order = require("../models/Order");
const Material = require("../models/Material");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");

/* SOCKET HELPER */
function emit(io, event, data) {
  try {
    io.emit(event, data);
  } catch (_) {}
}

async function createOrder(req, res, next) {
  try {
    const io = req.app.get("io");

    const order = await Order.create({
      ...req.body,
      createdBy: req.user._id,
    });

    emit(io, "order-created", order);

    res.status(201).json({
      success: true,
      message: "Order created",
      data: order,
    });
  } catch (err) {
    next(err);
  }
}

async function confirmOrder(req, res, next) {
  try {
    const { id } = req.params;
    const { saleAmount } = req.body;

    if (!saleAmount || saleAmount <= 0)
      return res
        .status(400)
        .json({ success: false, message: "Valid saleAmount required" });

    const order = await Order.findById(id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    order.status = "confirmed";
    order.saleAmount = Number(saleAmount);
    order.finalSalePrice = Number(saleAmount);

    order.confirmedBy = req.user._id;
    order.confirmedAt = new Date();

    await order.save();

    emit(req.app.get("io"), "order-updated", order);

    res.json({ success: true, message: "Order confirmed", data: order });
  } catch (err) {
    next(err);
  }
}

async function rejectOrder(req, res, next) {
  try {
    const { reason } = req.body;

    if (!reason)
      return res
        .status(400)
        .json({ success: false, message: "Reject reason required" });

    const order = await Order.findById(req.params.id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    order.status = "rejected";
    order.rejectionReason = reason;
    order.rejectedAt = new Date();
    order.confirmedBy = req.user._id;

    await order.save();

    emit(req.app.get("io"), "order-updated", order);

    res.json({ success: true, message: "Order rejected", data: order });
  } catch (err) {
    next(err);
  }
}

async function addMaterialUsage(req, res, next) {
  try {
    const io = req.app.get("io");
    const order = await Order.findById(req.params.id);

    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    const { materials } = req.body;
    if (!materials || materials.length === 0)
      return res
        .status(400)
        .json({ success: false, message: "Materials array required" });

    order.materialsUsed = order.materialsUsed || [];
    let totalMaterialCost = order.totalMaterialCost || 0;

    for (const m of materials) {
      if (!m.materialId || !m.quantity)
        return res.status(400).json({
          success: false,
          message: "materialId & quantity required",
        });

      const mat = await Material.findById(m.materialId);
      if (!mat)
        return res.status(404).json({
          success: false,
          message: "Material not found",
        });

      const qty = Number(m.quantity);

      if (mat.availableQty < qty)
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${mat.name}`,
        });

      mat.availableQty -= qty;
      await mat.save();

      const costPerUnit = mat.costPerUnit || 0;

      order.materialsUsed.push({
        materialId: mat._id,
        name: mat.name,
        quantity: qty,
        unit: mat.unit,
        costPerUnit,
        usedBy: req.user._id,
        note: m.note || "",
      });

      totalMaterialCost += qty * costPerUnit;

      emit(io, "material-updated", {
        materialId: mat._id,
        availableQty: mat.availableQty,
      });
    }

    order.totalMaterialCost = totalMaterialCost;
    await order.save();

    emit(io, "order-updated", order);

    res.json({
      success: true,
      message: "Materials added",
      data: order,
    });
  } catch (err) {
    next(err);
  }
}

async function editMaterialUsage(req, res, next) {
  try {
    const io = req.app.get("io");
    const { id, materialUsageId } = req.params;
    const { quantity, note } = req.body;

    const order = await Order.findById(id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    const usage = order.materialsUsed.id(materialUsageId);
    if (!usage)
      return res
        .status(404)
        .json({ success: false, message: "Material usage not found" });

    const newQty = Number(quantity);
    const oldQty = Number(usage.quantity);

    const diff = newQty - oldQty;

    const mat = await Material.findById(usage.materialId);
    if (!mat)
      return res
        .status(404)
        .json({ success: false, message: "Material not found" });

    if (diff > 0) {
      if (mat.availableQty < diff)
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${mat.name}`,
        });

      mat.availableQty -= diff;
    } else {
      mat.availableQty += Math.abs(diff);
    }

    await mat.save();

    usage.quantity = newQty;
    if (note !== undefined) usage.note = note;

    order.totalMaterialCost = order.materialsUsed.reduce(
      (s, u) => s + (u.costPerUnit || 0) * (u.quantity || 0),
      0
    );

    await order.save();

    emit(io, "material-updated", mat);
    emit(io, "order-updated", order);

    res.json({
      success: true,
      message: "Material usage updated",
      data: order,
    });
  } catch (err) {
    next(err);
  }
}

async function deleteMaterialUsage(req, res, next) {
  try {
    const io = req.app.get("io");
    const { id, materialUsageId } = req.params;

    const order = await Order.findById(id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    const usage = order.materialsUsed.id(materialUsageId);
    if (!usage)
      return res
        .status(404)
        .json({ success: false, message: "Material usage not found" });

    const mat = await Material.findById(usage.materialId);
    if (!mat)
      return res
        .status(404)
        .json({ success: false, message: "Material not found" });

    mat.availableQty += usage.quantity;
    await mat.save();

    usage.deleteOne();

    order.totalMaterialCost = order.materialsUsed.reduce(
      (s, u) => s + (u.costPerUnit || 0) * (u.quantity || 0),
      0
    );

    await order.save();

    emit(io, "material-updated", mat);
    emit(io, "order-updated", order);

    res.json({
      success: true,
      message: "Material usage removed",
      data: order,
    });
  } catch (err) {
    next(err);
  }
}

async function addExpense(req, res, next) {
  try {
    const io = req.app.get("io");
    const { type, label, amount, note } = req.body;

    if (!type || !amount)
      return res
        .status(400)
        .json({ success: false, message: "Type & amount required" });

    const order = await Order.findById(req.params.id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    order.expenses.push({
      type,
      label,
      amount,
      note,
      addedBy: req.user._id,
    });

    await order.save();

    emit(io, "order-updated", order);

    res.json({ success: true, message: "Expense added", data: order });
  } catch (err) {
    next(err);
  }
}

async function editExpense(req, res, next) {
  try {
    const io = req.app.get("io");

    const { id, expenseId } = req.params;
    const { type, label, amount, note } = req.body;

    const order = await Order.findById(id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    const ex = order.expenses.id(expenseId);
    if (!ex)
      return res
        .status(404)
        .json({ success: false, message: "Expense not found" });

    if (type) ex.type = type;
    if (label !== undefined) ex.label = label;
    if (amount !== undefined) ex.amount = Number(amount);
    if (note !== undefined) ex.note = note;

    await order.save();

    emit(io, "order-updated", order);

    res.json({ success: true, message: "Expense updated", data: order });
  } catch (err) {
    next(err);
  }
}

async function deleteExpense(req, res, next) {
  try {
    const io = req.app.get("io");
    const { id, expenseId } = req.params;

    const order = await Order.findById(id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    const ex = order.expenses.id(expenseId);
    if (!ex)
      return res
        .status(404)
        .json({ success: false, message: "Expense not found" });

    ex.deleteOne();
    await order.save();

    emit(io, "order-updated", order);

    res.json({ success: true, message: "Expense deleted", data: order });
  } catch (err) {
    next(err);
  }
}

async function updateOrderStatus(req, res, next) {
  try {
    const io = req.app.get("io");
    const { status } = req.body;

    const allowed = [
      "processing",
      "ready_for_delivery",
      "delivered",
      "completed",
    ];
    if (!allowed.includes(status))
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });

    const order = await Order.findById(req.params.id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    order.status = status;
    await order.save();

    emit(io, "order-updated", order);

    res.json({ success: true, message: "Status updated", data: order });
  } catch (err) {
    next(err);
  }
}

/* ----------------------------------------------------------
   GET ALL ORDERS  (FINAL FIXED VERSION)
---------------------------------------------------------- */
async function getAllOrders(req, res, next) {
  try {
    let { status, search } = req.query;

    let query = { isArchived: false };

    /* ⭐ FIX: MULTIPLE STATUS SUPPORT ⭐ */
    if (status) {
      const statusList = status.split(",").filter(Boolean);

      if (statusList.length === 1) {
        query.status = statusList[0];
      } else if (statusList.length > 1) {
        query.status = { $in: statusList };
      }
    }

    /* SEARCH SUPPORT */
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: "i" } },
        { customerPhone: { $regex: search, $options: "i" } },
      ];
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .populate("createdBy", "name")
      .populate("confirmedBy", "name");

    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
}

async function getMyOrders(req, res, next) {
  try {
    const orders = await Order.find({
      createdBy: req.user._id,
      isArchived: false,
    })
      .sort({ createdAt: -1 })
      .populate("createdBy", "name")
      .populate("confirmedBy", "name");

    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
}

async function getSingleOrder(req, res, next) {
  try {
    const orderId = req.params.id;
    console.log("🔥 getSingleOrder() CALLED with ID:", orderId);

    // Fetch Order
    const order = await Order.findById(orderId)
      .populate("createdBy", "name role")
      .populate("confirmedBy", "name role")
      .populate("materialsUsed.materialId", "name unit costPerUnit");

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // ✔ payments are stored INSIDE order → no populate needed
    const payments = order.payments || [];

    res.json({
      success: true,
      data: {
        ...order.toObject(),
        payments, // return stored payments
      },
    });
  } catch (err) {
    console.error("❌ ERROR getSingleOrder:", err);
    next(err);
  }
}

async function updateDrawing(req, res, next) {
  try {
    const { id, index } = req.params;

    const order = await Order.findById(id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    const d = order.drawings[index];
    if (!d)
      return res
        .status(404)
        .json({ success: false, message: "Drawing not found" });

    const { drawingUrl, serialized, notes, specs, measurements } = req.body;

    if (drawingUrl) d.drawingUrl = drawingUrl;
    if (serialized) d.savedShapes = serialized;
    if (notes) d.notes = notes;
    if (specs) d.specs = specs;
    if (measurements) d.measurements = measurements;

    await order.save();

    emit(req.app.get("io"), "order-updated", order);

    res.json({
      success: true,
      message: "Drawing updated",
      data: d,
    });
  } catch (err) {
    next(err);
  }
}

async function updateOrder(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    if (order.status !== "pending" && req.user.role !== "admin")
      return res.status(400).json({
        success: false,
        message: "Only pending orders can be edited",
      });

    if (
      order.createdBy.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    Object.assign(order, req.body);
    await order.save();

    emit(req.app.get("io"), "order-updated", order);

    res.json({
      success: true,
      message: "Order updated",
      data: order,
    });
  } catch (err) {
    next(err);
  }
}

async function deleteOrder(req, res, next) {
  try {
    const io = req.app.get("io");
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Allow admin to delete ANY order
    if (order.status !== "pending" && req.user.role !== "admin") {
      return res.status(400).json({
        success: false,
        message: "Only pending orders can be deleted by employees",
      });
    }

    // Only creator or admin can delete
    if (
      order.createdBy.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to delete this order",
      });
    }

    await Invoice.deleteOne({ orderId: order._id });
    await order.deleteOne();

    io.emit("order-deleted", { id });

    return res.json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (err) {
    console.error("❌ Delete Order Error:", err);
    next(err);
  }
}

async function addPayment(req, res, next) {
  try {
    const orderId = req.params.orderId;
    let { amount, method = "cash", note = "", type = "payment" } = req.body;

    // Ensure amount is a number
    amount = Number(amount);
    if (isNaN(amount)) {
      return res
        .status(400)
        .json({ success: false, message: "Amount must be a number" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    /* 1️⃣ Add Payment to Order */
    const newPayment = {
      amount,
      method,
      note,
      type,
      receivedBy: req.user._id,
      createdAt: new Date(),
    };

    order.payments.push(newPayment);

    /* 2️⃣ Get or Create Invoice */
    let invoice = await Invoice.findOne({ orderId });

    if (!invoice) {
      invoice = await Invoice.create({
        orderId,
        totalAmount: Number(order.totalAmount) || 0,
        paidAmount: amount,
        dueAmount: (Number(order.totalAmount) || 0) - amount,
      });
    } else {
      // Avoid NaN issues
      invoice.totalAmount = Number(invoice.totalAmount) || 0;
      invoice.paidAmount = Number(invoice.paidAmount) || 0;

      invoice.paidAmount += amount;
      invoice.dueAmount = invoice.totalAmount - invoice.paidAmount;

      await invoice.save();
    }

    /* 3️⃣ Add Transaction */

    /* 4️⃣ Update Order Amounts */
    order.paid = invoice.paidAmount;
    order.due = invoice.dueAmount;

    order.paymentStatus =
      invoice.dueAmount === 0
        ? "paid"
        : invoice.paidAmount > 0
        ? "partial"
        : "due";

    await order.save();

    res.json({
      success: true,
      message: "Payment added successfully",
      order,
      invoice,
    });
  } catch (err) {
    console.error("❌ Add Payment Error:", err);
    next(err);
  }
}

async function editPayment(req, res, next) {
  try {
    const orderId = req.params.orderId;
    const paymentId = req.params.paymentId;
    const { amount, method = "cash", note = "", type = "payment" } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // find the payment inside order.payments
    const payment = order.payments.id(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // update fields
    payment.amount = amount;
    payment.method = method;
    payment.note = note;
    payment.type = type;
    payment.updatedAt = new Date();

    await order.save();

    console.log("✏️ Payment updated:", paymentId);

    res.json({ success: true, data: order });
  } catch (err) {
    console.error("❌ Edit Payment Error:", err);
    next(err);
  }
}

async function deletePayment(req, res, next) {
  try {
    const orderId = req.params.orderId;
    const paymentId = req.params.paymentId;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const payment = order.payments.id(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // remove payment
    payment.deleteOne();
    await order.save();

    console.log("🗑️ Payment deleted:", paymentId);

    res.json({
      success: true,
      message: "Payment deleted",
      data: order,
    });
  } catch (err) {
    console.error("❌ Delete Payment Error:", err);
    next(err);
  }
}

module.exports = {
  createOrder,
  confirmOrder,
  rejectOrder,
  addMaterialUsage,
  editMaterialUsage,
  deleteMaterialUsage,
  addExpense,
  editExpense,
  deleteExpense,
  updateOrderStatus,
  getAllOrders,
  getMyOrders,
  getSingleOrder,
  updateDrawing,
  updateOrder,
  deleteOrder,
  addPayment,
  editPayment,
  deletePayment,
};
