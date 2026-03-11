const Receipt = require("../models/Receipt");
const Order = require("../models/Order");
const Counter = require("../models/Counter");

const genReceiptNo = async () => {
    const counter = await Counter.findOneAndUpdate(
        { key: "receipt" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return `SNGR-R${String(counter.seq).padStart(4, "0")}`;
};

class ReceiptService {
    async createReceipt(data) {
        const { orderId, paymentId, amount, mode = "cash", note = "" } = data;

        if (!orderId || !paymentId || !amount) {
            return { error: "orderId, paymentId & amount required", status: 400 };
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return { error: "Order not found", status: 404 };
        }

        const payment = order.payments.id(paymentId);
        if (!payment) {
            return { error: "Payment not found for receipt", status: 404 };
        }

        const previousPaid = (order.payments || []).reduce(
            (s, p) => s + Number(p.amount || 0),
            0
        );

        const paidTillNow = previousPaid;
        const sale = Number(order.saleAmount) || Number(order.finalSalePrice) || 0;
        const balanceDue = Math.max(0, sale - paidTillNow);

        const receipt = await Receipt.create({
            orderId,
            paymentId,
            amount,
            mode,
            note,
            receiptNo: await genReceiptNo(),
            paidTillNow,
            balanceDue,
        });

        payment.receiptId = receipt._id;
        await order.save();

        return receipt;
    }

    async getReceiptsByOrder(orderId) {
        const receipts = await Receipt.find({
            orderId,
        }).sort({ createdAt: -1 }).lean();

        return receipts;
    }

    async getReceipt(id) {
        const receipt = await Receipt.findById(id).populate({
            path: "orderId",
            select:
                "customerName customerPhone customerAddress drawings saleAmount finalSalePrice status",
        }).lean();

        if (!receipt) {
            return { error: "Receipt not found", status: 404 };
        }

        return receipt;
    }

    async deleteReceipt(id) {
        const receipt = await Receipt.findById(id);
        if (!receipt) {
            return { error: "Receipt not found", status: 404 };
        }

        const order = await Order.findById(receipt.orderId);

        if (order) {
            order.payments = (order.payments || []).filter(
                (p) => String(p._id) !== String(receipt.paymentId)
            );

            const paid = order.payments.reduce(
                (s, p) => s + Number(p.amount || 0),
                0
            );

            const sale =
                Number(order.saleAmount) || Number(order.finalSalePrice) || 0;

            const due = Math.max(0, sale - paid);

            order.paid = paid;
            order.due = due;
            order.paymentStatus = due === 0 ? "paid" : paid > 0 ? "partial" : "due";

            await order.save();
        }

        await receipt.deleteOne();

        return true;
    }

    async getReceiptForPdf(id) {
        const receipt = await Receipt.findById(id).populate({
            path: "orderId",
            select: "customerName customerPhone customerAddress",
        });

        if (!receipt) {
            return { error: "Receipt not found", status: 404 };
        }

        return receipt;
    }

    async getAllReceipts() {
        const receipts = await Receipt.find()
            .populate("orderId", "customerName customerPhone")
            .sort({ createdAt: -1 })
            .lean();

        return receipts;
    }

    async getReceiptsForPdfReport(from, to) {
        const filter = {};
        if (from || to) {
            filter.createdAt = {};
            if (from) filter.createdAt.$gte = new Date(from);
            if (to) filter.createdAt.$lte = new Date(to);
        }

        const receipts = await Receipt.find(filter)
            .populate("orderId", "customerName customerPhone")
            .sort({ createdAt: 1 })
            .lean();

        return receipts;
    }
}

module.exports = new ReceiptService();
