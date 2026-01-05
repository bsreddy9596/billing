console.log("🔥 orderController LOADED");

const mongoose = require("mongoose");
const Order = require("../models/Order");
const Material = require("../models/Material");
const Receipt = require("../models/Receipt");
const Counter = require("../models/Counter");
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

    if (!saleAmount || saleAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid saleAmount required",
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    order.status = "confirmed";
    order.saleAmount = Number(saleAmount);
    order.finalSalePrice = Number(saleAmount);
    order.confirmedBy = req.user._id;
    order.confirmedAt = new Date();

    await order.save();

    emit(req.app.get("io"), "order-updated", order);

    res.json({
      success: true,
      message: "Order confirmed",
      data: order,
    });
  } catch (err) {
    next(err);
  }
}

async function rejectOrder(req, res, next) {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Reject reason required",
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    order.status = "rejected";
    order.rejectionReason = reason;
    order.rejectedAt = new Date();
    order.confirmedBy = req.user._id;

    await order.save();

    emit(req.app.get("io"), "order-updated", order);

    res.json({
      success: true,
      message: "Order rejected",
      data: order,
    });
  } catch (err) {
    next(err);
  }
}

async function addMaterialUsage(req, res, next) {
  try {
    const io = req.app.get("io");
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const { materials } = req.body;
    if (!Array.isArray(materials) || materials.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Materials array required",
      });
    }

    order.materialsUsed = order.materialsUsed || [];

    // start from existing cost (important)
    let totalMaterialCost = Number(order.totalMaterialCost || 0);

    for (const m of materials) {
      if (!m.materialId || !m.quantity) {
        return res.status(400).json({
          success: false,
          message: "materialId & quantity required",
        });
      }

      /* ================= FETCH MATERIAL ================= */
      const mat = await Material.findById(m.materialId);
      if (!mat) {
        return res.status(404).json({
          success: false,
          message: "Material not found",
        });
      }

      const qty = Number(m.quantity);
      if (qty <= 0) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be greater than 0",
        });
      }

      /* ================= STOCK CHECK ================= */
      if (mat.availableQty < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${mat.name}`,
        });
      }

      /* ================= CALCULATE COST ================= */
      const rate = Number(mat.costPerUnit || 0);
      const total = rate * qty;

      /* ================= UPDATE MATERIAL STOCK ================= */
      mat.availableQty -= qty;
      await mat.save();

      /* ================= SAVE INTO ORDER ================= */
      order.materialsUsed.push({
        materialId: mat._id,
        name: mat.name,
        quantity: qty,
        unit: mat.unit,

        rate, // ✅ UI uses this
        total, // ✅ UI uses this

        costPerUnit: rate, // optional (keep for analytics)
        usedBy: req.user._id,
        note: m.note || "",
      });

      /* ================= ADD TO ORDER COST ================= */
      totalMaterialCost += total;

      /* ================= SOCKET EVENT ================= */
      emit(io, "material-updated", {
        materialId: mat._id,
        availableQty: mat.availableQty,
      });
    }

    /* ================= SAVE ORDER ================= */
    order.totalMaterialCost = totalMaterialCost;
    await order.save();

    /* 🔥 VERY IMPORTANT — FETCH UPDATED & POPULATED ORDER */
    const updatedOrder = await Order.findById(order._id).populate(
      "materialsUsed.materialId"
    );

    /* SOCKET */
    emit(io, "order-updated", updatedOrder);

    res.json({
      success: true,
      message: "Materials added successfully",
      data: updatedOrder,
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
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const usage = order.materialsUsed.id(materialUsageId);
    if (!usage) {
      return res.status(404).json({
        success: false,
        message: "Material usage not found",
      });
    }

    const newQty = Number(quantity);
    const oldQty = Number(usage.quantity);
    const diff = newQty - oldQty;

    const mat = await Material.findById(usage.materialId);
    if (!mat) {
      return res.status(404).json({
        success: false,
        message: "Material not found",
      });
    }

    if (diff > 0) {
      if (mat.availableQty < diff) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${mat.name}`,
        });
      }
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
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const usage = order.materialsUsed.id(materialUsageId);
    if (!usage) {
      return res.status(404).json({
        success: false,
        message: "Material usage not found",
      });
    }

    const mat = await Material.findById(usage.materialId);
    if (!mat) {
      return res.status(404).json({
        success: false,
        message: "Material not found",
      });
    }

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

    if (!type || !amount) {
      return res.status(400).json({
        success: false,
        message: "Type & amount required",
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    order.expenses.push({
      type,
      label,
      amount,
      note,
      addedBy: req.user._id,
    });

    await order.save();

    emit(io, "order-updated", order);

    res.json({
      success: true,
      message: "Expense added",
      data: order,
    });
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
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const ex = order.expenses.id(expenseId);
    if (!ex) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    if (type) ex.type = type;
    if (label !== undefined) ex.label = label;
    if (amount !== undefined) ex.amount = Number(amount);
    if (note !== undefined) ex.note = note;

    await order.save();

    emit(io, "order-updated", order);

    res.json({
      success: true,
      message: "Expense updated",
      data: order,
    });
  } catch (err) {
    next(err);
  }
}

async function deleteExpense(req, res, next) {
  try {
    const io = req.app.get("io");
    const { id, expenseId } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const ex = order.expenses.id(expenseId);
    if (!ex) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    ex.deleteOne();
    await order.save();

    emit(io, "order-updated", order);

    res.json({
      success: true,
      message: "Expense deleted",
      data: order,
    });
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

    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    order.status = status;
    await order.save();

    emit(io, "order-updated", order);

    res.json({
      success: true,
      message: "Status updated",
      data: order,
    });
  } catch (err) {
    next(err);
  }
}

async function getAllOrders(req, res, next) {
  try {
    let { status, search } = req.query;
    let query = { isArchived: false };

    if (status) {
      const statusList = status.split(",").filter(Boolean);
      if (statusList.length === 1) query.status = statusList[0];
      else if (statusList.length > 1) query.status = { $in: statusList };
    }

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
    const order = await Order.findById(req.params.id)
      .populate("createdBy", "name role")
      .populate("confirmedBy", "name role")
      .populate("materialsUsed.materialId", "name unit costPerUnit");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (err) {
    next(err);
  }
}

async function updateDrawing(req, res, next) {
  try {
    const { id, index } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const d = order.drawings[index];
    if (!d) {
      return res.status(404).json({
        success: false,
        message: "Drawing not found",
      });
    }

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
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.status !== "pending" && req.user.role !== "admin") {
      return res.status(400).json({
        success: false,
        message: "Only pending orders can be edited",
      });
    }

    if (
      order.createdBy.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not allowed",
      });
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

    if (order.status !== "pending" && req.user.role !== "admin") {
      return res.status(400).json({
        success: false,
        message: "Only pending orders can be deleted",
      });
    }

    if (
      order.createdBy.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not allowed",
      });
    }

    await order.deleteOne();
    io.emit("order-deleted", { id });

    res.json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (err) {
    next(err);
  }
}

const genReceiptNo = async () => {
  const counter = await Counter.findOneAndUpdate(
    { key: "receipt" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return `SNGR-R${String(counter.seq).padStart(4, "0")}`;
};

async function addPayment(req, res, next) {
  try {
    const { orderId } = req.params;
    let { amount, mode = "cash", note = "", type = "payment" } = req.body;

    amount = Number(amount);
    if (!amount || amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Valid amount required" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const paidBefore = order.payments.reduce(
      (s, p) => s + Number(p.amount || 0),
      0
    );

    const payment = {
      amount,
      method: mode,
      note,
      type,
      receivedBy: req.user._id,
    };

    // ✅ PUSH PAYMENT
    order.payments.push(payment);
    const savedPayment = order.payments[order.payments.length - 1];

    const paidTillNow = paidBefore + amount;
    const sale = Number(order.saleAmount || order.finalSalePrice || 0);
    const balanceDue = Math.max(0, sale - paidTillNow);

    order.paid = paidTillNow;
    order.due = balanceDue;
    order.paymentStatus =
      balanceDue === 0 ? "paid" : paidTillNow > 0 ? "partial" : "due";

    // ✅ CREATE RECEIPT
    const receipt = await Receipt.create({
      orderId: order._id,
      paymentId: savedPayment._id,
      receiptNo: await genReceiptNo(),
      amount,
      mode,
      note,
      receivedBy: req.user._id,
      paidTillNow,
      balanceDue,
    });

    // ✅ LINK RECEIPT BACK TO PAYMENT
    savedPayment.receiptId = receipt._id;

    await order.save();

    res.json({
      success: true,
      message: "Payment & Receipt created",
      data: { order, receipt },
    });
  } catch (err) {
    next(err);
  }
}

async function editPayment(req, res, next) {
  try {
    const { orderId, paymentId } = req.params;
    const { amount, method, note, type } = req.body;

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

    if (amount !== undefined) payment.amount = Number(amount);
    if (method !== undefined) payment.method = method;
    if (note !== undefined) payment.note = note;
    if (type !== undefined) payment.type = type;

    const paid = order.payments.reduce((s, p) => s + Number(p.amount || 0), 0);

    const sale = Number(order.saleAmount || 0);
    const due = Math.max(0, sale - paid);

    order.paid = paid;
    order.due = due;
    order.paymentStatus = due === 0 ? "paid" : paid > 0 ? "partial" : "due";

    await order.save();

    res.json({
      success: true,
      data: order,
    });
  } catch (err) {
    next(err);
  }
}

async function deletePayment(req, res, next) {
  try {
    const { orderId, paymentId } = req.params;

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

    payment.deleteOne();

    const paid = order.payments.reduce((s, p) => s + Number(p.amount || 0), 0);

    const sale = Number(order.saleAmount || 0);
    const due = Math.max(0, sale - paid);

    order.paid = paid;
    order.due = due;
    order.paymentStatus = due === 0 ? "paid" : paid > 0 ? "partial" : "due";

    await order.save();

    res.json({
      success: true,
      data: order,
    });
  } catch (err) {
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
