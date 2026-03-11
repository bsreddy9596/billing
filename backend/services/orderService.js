const mongoose = require("mongoose");
const Order = require("../models/Order");
const Material = require("../models/Material");
const Receipt = require("../models/Receipt");
const Counter = require("../models/Counter");
const ActivityLog = require("../models/ActivityLog");

function emit(io, event, data) {
    try {
        if (io) io.emit(event, data);
    } catch (_) { }
}

const genReceiptNo = async () => {
    const counter = await Counter.findOneAndUpdate(
        { key: "receipt" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );

    return `SNGR-R${String(counter.seq).padStart(4, "0")}`;
};

class OrderService {
    async createOrder(data, userId, io) {
        // Auto-set expectedDelivery if missing
        if (!data.expectedDelivery) {
            const defaultDate = new Date();
            defaultDate.setDate(defaultDate.getDate() + 7);
            data.expectedDelivery = defaultDate;
        }

        const order = await Order.create({
            ...data,
            createdBy: userId,
        });

        await ActivityLog.create({
            userId,
            action: "Order Created",
            targetType: "Order",
            targetId: order._id,
            message: `Order created for ${data.customerName || "Customer"}`,
        });

        emit(io, "order-created", order);

        return order;
    }

    async confirmOrder(orderId, saleAmount, userId, io) {
        if (!saleAmount || saleAmount <= 0) {
            return { error: "Valid saleAmount required", status: 400 };
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return { error: "Order not found", status: 404 };
        }

        order.status = "confirmed";
        order.saleAmount = Number(saleAmount);
        order.finalSalePrice = Number(saleAmount);
        order.confirmedBy = userId;
        order.confirmedAt = new Date();

        await order.save();

        emit(io, "order-updated", order);

        return order;
    }

    async rejectOrder(orderId, reason, userId, io) {
        if (!reason) {
            return { error: "Reject reason required", status: 400 };
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return { error: "Order not found", status: 404 };
        }

        order.status = "rejected";
        order.rejectionReason = reason;
        order.rejectedAt = new Date();
        order.confirmedBy = userId;

        await order.save();

        await ActivityLog.create({
            userId,
            action: "Order Rejected",
            targetType: "Order",
            targetId: order._id,
            message: `Order rejected for ${order.customerName || "Customer"}`,
        });

        emit(io, "order-updated", order);

        return order;
    }

    async addMaterialUsage(orderId, materials, userId, io) {
        const order = await Order.findById(orderId);

        if (!order) {
            return { error: "Order not found", status: 404 };
        }

        if (!Array.isArray(materials) || materials.length === 0) {
            return { error: "Materials array required", status: 400 };
        }

        order.materialsUsed = order.materialsUsed || [];
        let totalMaterialCost = Number(order.totalMaterialCost || 0);

        // 1. Fetch all materials concurrently
        const materialPromises = materials.map((m) => {
            if (!m.materialId || !m.quantity) {
                throw new Error("materialId & quantity required");
            }
            return Material.findById(m.materialId);
        });

        // Let it throw an error inside the map and catch it to return 400
        let mats;
        try {
            mats = await Promise.all(materialPromises);
        } catch (e) {
            return { error: e.message, status: 400 };
        }

        // 2. Validate stock and perform calculations
        for (let i = 0; i < materials.length; i++) {
            const m = materials[i];
            const mat = mats[i];

            if (!mat) {
                return { error: `Material not found for ID: ${m.materialId}`, status: 404 };
            }

            const qty = Number(m.quantity);
            if (qty <= 0) {
                return { error: "Quantity must be greater than 0", status: 400 };
            }

            if (mat.availableQty < qty) {
                return { error: `Insufficient stock for ${mat.name}`, status: 400 };
            }

            const rate = Number(mat.costPerUnit || 0);
            const total = rate * qty;

            mat.availableQty -= qty;

            order.materialsUsed.push({
                materialId: mat._id,
                name: mat.name,
                quantity: qty,
                unit: mat.unit,
                rate,
                total,
                costPerUnit: rate,
                usedBy: userId,
                note: m.note || "",
            });

            totalMaterialCost += total;

            emit(io, "material-updated", {
                materialId: mat._id,
                availableQty: mat.availableQty,
            });
        }

        // 3. Save all updated materials concurrently
        await Promise.all(mats.map((m) => m.save()));

        order.totalMaterialCost = totalMaterialCost;
        await order.save();

        const updatedOrder = await Order.findById(order._id).populate(
            "materialsUsed.materialId"
        );

        emit(io, "order-updated", updatedOrder);

        return updatedOrder;
    }

    async editMaterialUsage(orderId, materialUsageId, quantity, note, io) {
        const order = await Order.findById(orderId);
        if (!order) {
            return { error: "Order not found", status: 404 };
        }

        const usage = order.materialsUsed.id(materialUsageId);
        if (!usage) {
            return { error: "Material usage not found", status: 404 };
        }

        const newQty = Number(quantity);
        const oldQty = Number(usage.quantity);
        const diff = newQty - oldQty;

        const mat = await Material.findById(usage.materialId);
        if (!mat) {
            return { error: "Material not found", status: 404 };
        }

        if (diff > 0) {
            if (mat.availableQty < diff) {
                return { error: `Insufficient stock for ${mat.name}`, status: 400 };
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

        return order;
    }

    async deleteMaterialUsage(orderId, materialUsageId, io) {
        const order = await Order.findById(orderId);
        if (!order) {
            return { error: "Order not found", status: 404 };
        }

        const usage = order.materialsUsed.id(materialUsageId);
        if (!usage) {
            return { error: "Material usage not found", status: 404 };
        }

        const mat = await Material.findById(usage.materialId);
        if (!mat) {
            return { error: "Material not found", status: 404 };
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

        return order;
    }

    async addExpense(orderId, type, label, amount, note, userId, io) {
        if (!type || !amount) {
            return { error: "Type & amount required", status: 400 };
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return { error: "Order not found", status: 404 };
        }

        order.expenses.push({
            type,
            label,
            amount,
            note,
            addedBy: userId,
        });

        await order.save();

        emit(io, "order-updated", order);

        return order;
    }

    async editExpense(orderId, expenseId, data, io) {
        const order = await Order.findById(orderId);
        if (!order) {
            return { error: "Order not found", status: 404 };
        }

        const ex = order.expenses.id(expenseId);
        if (!ex) {
            return { error: "Expense not found", status: 404 };
        }

        const { type, label, amount, note } = data;

        if (type) ex.type = type;
        if (label !== undefined) ex.label = label;
        if (amount !== undefined) ex.amount = Number(amount);
        if (note !== undefined) ex.note = note;

        await order.save();

        emit(io, "order-updated", order);

        return order;
    }

    async deleteExpense(orderId, expenseId, io) {
        const order = await Order.findById(orderId);
        if (!order) {
            return { error: "Order not found", status: 404 };
        }

        const ex = order.expenses.id(expenseId);
        if (!ex) {
            return { error: "Expense not found", status: 404 };
        }

        ex.deleteOne();
        await order.save();

        emit(io, "order-updated", order);

        return order;
    }

    async updateOrderStatus(orderId, status, io) {
        const allowed = [
            "processing",
            "ready_for_delivery",
            "delivered",
            "completed",
        ];

        if (!allowed.includes(status)) {
            return { error: "Invalid status", status: 400 };
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return { error: "Order not found", status: 404 };
        }

        order.status = status;
        await order.save();

        emit(io, "order-updated", order);

        return order;
    }

    async getAllOrders(status, search) {
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
            .populate("confirmedBy", "name")
            .lean();

        return orders;
    }

    async getMyOrders(userId) {
        const orders = await Order.find({
            createdBy: userId,
            isArchived: false,
        })
            .sort({ createdAt: -1 })
            .populate("createdBy", "name")
            .populate("confirmedBy", "name")
            .lean();

        return orders;
    }

    async getSingleOrder(orderId) {
        const order = await Order.findById(orderId)
            .populate("customerId")
            .populate("createdBy", "name role")
            .populate("confirmedBy", "name role")
            .populate("materialsUsed.materialId", "name unit costPerUnit")
            .lean();

        if (!order) {
            return { error: "Order not found", status: 404 };
        }

        return order;
    }

    async updateDrawing(orderId, index, data, io) {
        const order = await Order.findById(orderId);
        if (!order) {
            return { error: "Order not found", status: 404 };
        }

        const d = order.drawings[index];
        if (!d) {
            return { error: "Drawing not found", status: 404 };
        }

        const { drawingUrl, serialized, notes, specs, measurements } = data;

        if (drawingUrl) d.drawingUrl = drawingUrl;
        if (serialized) d.savedShapes = serialized;
        if (notes) d.notes = notes;
        if (specs) d.specs = specs;
        if (measurements) d.measurements = measurements;

        await order.save();

        emit(io, "order-updated", order);

        return d;
    }

    async updateOrder(orderId, data, userId, userRole, io) {
        const order = await Order.findById(orderId);
        if (!order) {
            return { error: "Order not found", status: 404 };
        }

        if (order.status !== "pending" && userRole !== "admin") {
            return { error: "Only pending orders can be edited", status: 400 };
        }

        if (
            order.createdBy.toString() !== userId.toString() &&
            userRole !== "admin"
        ) {
            return { error: "Not allowed", status: 403 };
        }

        Object.assign(order, data);
        await order.save();

        emit(io, "order-updated", order);

        return order;
    }

    async deleteOrder(orderId, userId, userRole, io) {
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return { error: "Invalid order ID", status: 400 };
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return { error: "Order not found", status: 404 };
        }

        if (order.status !== "pending" && userRole !== "admin") {
            return { error: "Only pending orders can be deleted", status: 400 };
        }

        if (
            order.createdBy.toString() !== userId.toString() &&
            userRole !== "admin"
        ) {
            return { error: "Not allowed", status: 403 };
        }

        await order.deleteOne();
        emit(io, "order-deleted", { id: orderId });

        return true;
    }

    async addPayment(orderId, amount, mode = "cash", note = "", type = "payment", userId) {
        amount = Number(amount);
        if (!amount || amount <= 0) {
            return { error: "Valid amount required", status: 400 };
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return { error: "Order not found", status: 404 };
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
            receivedBy: userId,
        };

        order.payments.push(payment);
        const savedPayment = order.payments[order.payments.length - 1];

        const paidTillNow = paidBefore + amount;
        const sale = Number(order.saleAmount || order.finalSalePrice || 0);
        const balanceDue = Math.max(0, sale - paidTillNow);

        order.paid = paidTillNow;
        order.due = balanceDue;
        order.paymentStatus =
            balanceDue === 0 ? "paid" : paidTillNow > 0 ? "partial" : "due";

        const receipt = await Receipt.create({
            orderId: order._id,
            paymentId: savedPayment._id,
            receiptNo: await genReceiptNo(),
            amount,
            mode,
            note,
            receivedBy: userId,
            paidTillNow,
            balanceDue,
        });

        savedPayment.receiptId = receipt._id;

        await order.save();

        return { order, receipt };
    }

    async editPayment(orderId, paymentId, data) {
        const { amount, method, note, type } = data;

        const order = await Order.findById(orderId);
        if (!order) {
            return { error: "Order not found", status: 404 };
        }

        const payment = order.payments.id(paymentId);
        if (!payment) {
            return { error: "Payment not found", status: 404 };
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

        return order;
    }

    async deletePayment(orderId, paymentId) {
        const order = await Order.findById(orderId);
        if (!order) {
            return { error: "Order not found", status: 404 };
        }

        const payment = order.payments.id(paymentId);
        if (!payment) {
            return { error: "Payment not found", status: 404 };
        }

        payment.deleteOne();

        const paid = order.payments.reduce((s, p) => s + Number(p.amount || 0), 0);

        const sale = Number(order.saleAmount || 0);
        const due = Math.max(0, sale - paid);

        order.paid = paid;
        order.due = due;
        order.paymentStatus = due === 0 ? "paid" : paid > 0 ? "partial" : "due";

        await order.save();

        return order;
    }
}

module.exports = new OrderService();
