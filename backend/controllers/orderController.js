
const orderService = require("../services/orderService");

async function createOrder(req, res, next) {
  try {
    const io = req.app.get("io");
    const result = await orderService.createOrder(req.body, req.user._id, io);

    res.status(201).json({
      success: true,
      message: "Order created",
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function confirmOrder(req, res, next) {
  try {
    const io = req.app.get("io");
    const result = await orderService.confirmOrder(req.params.id, req.body.saleAmount, req.user._id, io);

    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: "Order confirmed",
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function rejectOrder(req, res, next) {
  try {
    const io = req.app.get("io");
    const result = await orderService.rejectOrder(req.params.id, req.body.reason, req.user._id, io);

    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: "Order rejected",
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function addMaterialUsage(req, res, next) {
  try {
    const io = req.app.get("io");
    const result = await orderService.addMaterialUsage(req.params.id, req.body.materials, req.user._id, io);

    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: "Materials added successfully",
      data: result,
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

    const result = await orderService.editMaterialUsage(id, materialUsageId, quantity, note, io);

    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: "Material usage updated",
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function deleteMaterialUsage(req, res, next) {
  try {
    const io = req.app.get("io");
    const { id, materialUsageId } = req.params;

    const result = await orderService.deleteMaterialUsage(id, materialUsageId, io);

    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: "Material usage removed",
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function addExpense(req, res, next) {
  try {
    const io = req.app.get("io");
    const { type, label, amount, note } = req.body;

    const result = await orderService.addExpense(req.params.id, type, label, amount, note, req.user._id, io);

    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: "Expense added",
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function editExpense(req, res, next) {
  try {
    const io = req.app.get("io");
    const { id, expenseId } = req.params;

    const result = await orderService.editExpense(id, expenseId, req.body, io);

    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: "Expense updated",
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function deleteExpense(req, res, next) {
  try {
    const io = req.app.get("io");
    const { id, expenseId } = req.params;

    const result = await orderService.deleteExpense(id, expenseId, io);

    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: "Expense deleted",
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function updateOrderStatus(req, res, next) {
  try {
    const io = req.app.get("io");
    const result = await orderService.updateOrderStatus(req.params.id, req.body.status, io);

    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: "Status updated",
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function getAllOrders(req, res, next) {
  try {
    const { status, search } = req.query;
    const data = await orderService.getAllOrders(status, search);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getMyOrders(req, res, next) {
  try {
    const data = await orderService.getMyOrders(req.user._id);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function getSingleOrder(req, res, next) {
  try {
    const result = await orderService.getSingleOrder(req.params.id);

    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function updateDrawing(req, res, next) {
  try {
    const io = req.app.get("io");
    const { id, index } = req.params;

    const result = await orderService.updateDrawing(id, index, req.body, io);

    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: "Drawing updated",
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function updateOrder(req, res, next) {
  try {
    const io = req.app.get("io");
    const result = await orderService.updateOrder(req.params.id, req.body, req.user._id, req.user.role, io);

    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: "Order updated",
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function deleteOrder(req, res, next) {
  try {
    const io = req.app.get("io");
    const result = await orderService.deleteOrder(req.params.id, req.user._id, req.user.role, io);

    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (err) {
    next(err);
  }
}

async function addPayment(req, res, next) {
  try {
    const { amount, mode, note, type } = req.body;

    const result = await orderService.addPayment(req.params.orderId, amount, mode, note, type, req.user._id);

    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: "Payment & Receipt created",
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function editPayment(req, res, next) {
  try {
    const { orderId, paymentId } = req.params;

    const result = await orderService.editPayment(orderId, paymentId, req.body);

    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

async function deletePayment(req, res, next) {
  try {
    const { orderId, paymentId } = req.params;

    const result = await orderService.deletePayment(orderId, paymentId);

    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      data: result,
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
