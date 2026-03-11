const Invoice = require("../models/Invoice");
const Order = require("../models/Order");
const Product = require("../models/Product");

async function generateInvoiceNumber() {
    const prefix = process.env.INVOICE_PREFIX || "INV";
    const year = new Date().getFullYear();

    const count = await Invoice.countDocuments({
        createdAt: {
            $gte: new Date(year, 0, 1),
            $lt: new Date(year + 1, 0, 1),
        },
    });

    return `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;
}

class InvoiceService {
    async getOrCreateOrderInvoice(orderId, userId) {
        const order = await Order.findById(orderId).lean();
        if (!order) return { error: "Order not found", status: 404 };

        let invoice = await Invoice.findOne({
            invoiceType: "order",
            orderId,
            cancelled: false,
        });

        const orderPayments = (order.payments || []).map((p) => ({
            type: p.type || "payment",
            amount: Number(p.amount || 0),
            method: p.method || "cash",
            note: p.note || "",
            date: p.createdAt || new Date(),
            receiptId: p.receiptId || null,
        }));

        const paidAmount = orderPayments.reduce(
            (s, p) => s + Number(p.amount || 0),
            0
        );

        if (invoice) {
            invoice.payments = orderPayments;
            invoice.paidAmount = paidAmount;
            invoice.dueAmount = Math.max(0, invoice.total - paidAmount);
            invoice.status =
                paidAmount === 0
                    ? "unpaid"
                    : paidAmount >= invoice.total
                        ? "paid"
                        : "partial";

            await invoice.save();
            return invoice;
        }

        const saleAmount = Number(order.saleAmount || 0);
        let items = [];

        if (Array.isArray(order.drawings) && order.drawings.length > 0) {
            items = order.drawings.map((d, i) => ({
                productId: d._id || null,
                description: d.itemType || d.name || `Item ${i + 1}`,
                qty: Number(d.qty || 1),
                rate: Number(d.rate || saleAmount),
                amount: Number(d.rate || saleAmount) * Number(d.qty || 1),
            }));
        } else {
            items = [
                {
                    productId: null,
                    description: "Order Amount",
                    qty: 1,
                    rate: saleAmount,
                    amount: saleAmount,
                },
            ];
        }

        const subTotal = items.reduce((s, i) => s + Number(i.amount || 0), 0);

        invoice = await Invoice.create({
            invoiceType: "order",
            orderId,
            invoiceNumber: await generateInvoiceNumber(),
            customerName: order.customerName || "General Customer",
            customerPhone: order.customerPhone || "",
            customerAddress: order.customerAddress || "",
            items,
            subTotal,
            total: subTotal,
            payments: orderPayments,
            paidAmount,
            dueAmount: Math.max(0, subTotal - paidAmount),
            status: paidAmount === 0 ? "unpaid" : paidAmount >= subTotal ? "paid" : "partial",
            createdBy: userId,
        });

        return invoice;
    }

    async createProductInvoice(userId, data) {
        const { customerName, customerPhone, customerAddress, items = [], payments = [] } = data;

        if (!items.length) {
            return { message: "Items required", status: 400 };
        }

        let subTotal = 0;
        let totalTax = 0;
        const finalItems = [];

        // 1. Fetch all products concurrently
        const productPromises = items.map((it) => Product.findById(it.productId));
        const products = await Promise.all(productPromises);

        // 2. Validate stock and calculate totals
        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            const product = products[i];

            if (!product) return { message: `Product not found for ID: ${it.productId}`, status: 404 };

            if (product.stockQty < it.qty) {
                return { message: `Insufficient stock for ${product.name}`, status: 400 };
            }

            const baseAmount = Number(it.qty) * Number(it.rate);
            const taxPercent = Number(it.taxPercent || 0);
            const itemTax = baseAmount * (taxPercent / 100);
            const amount = baseAmount + itemTax;

            subTotal += baseAmount;
            totalTax += itemTax;

            finalItems.push({
                productId: product._id,
                description: product.name,
                qty: it.qty,
                rate: it.rate,
                taxPercent,
                taxAmount: itemTax,
                unit: it.unit || "pcs",
                amount,
            });

            product.stockQty -= it.qty; // Update stock object temporarily
        }

        // 3. Save all updated products concurrently
        await Promise.all(products.map((p) => p.save()));

        let paidAmount = 0;
        const finalPayments = payments.map((p) => {
            paidAmount += Number(p.amount || 0);
            return {
                label: p.label || "Payment",
                amount: Number(p.amount),
                date: p.date || new Date(),
                method: p.method || "cash",
                receivedBy: userId,
            };
        });

        const invoiceTotal = subTotal + totalTax;
        const dueAmount = Math.max(0, invoiceTotal - paidAmount);
        const status = dueAmount === 0 ? "paid" : paidAmount > 0 ? "partial" : "unpaid";

        const invoice = await Invoice.create({
            invoiceType: "product",
            invoiceNumber: await generateInvoiceNumber(),
            customerName,
            customerPhone,
            customerAddress,
            items: finalItems,
            subTotal,
            taxAmount: totalTax,
            total: invoiceTotal,
            payments: finalPayments,
            paidAmount,
            dueAmount,
            status,
            createdBy: userId,
            updatedBy: userId,
            lastPaymentBy: finalPayments.length ? userId : null,
            lastPaymentAt: finalPayments.length ? new Date() : null,
        });

        return invoice;
    }

    async getInvoiceById(id) {
        const invoice = await Invoice.findById(id)
            .populate("createdBy", "name role")
            .populate("payments.receivedBy", "name role")
            .lean();

        if (!invoice) return { message: "Invoice not found", status: 404 };
        return invoice;
    }

    async getInvoices(type) {
        const filter = {};
        if (type && type !== "all") {
            filter.invoiceType = type;
        }
        return Invoice.find(filter).sort({ createdAt: -1 }).lean();
    }

    async cancelInvoice(id, userId) {
        const invoice = await Invoice.findById(id);
        if (!invoice) return { message: "Invoice not found", status: 404 };

        if (invoice.paidAmount > 0) {
            return { message: "Paid invoice cannot be cancelled", status: 403 };
        }

        invoice.cancelled = true;
        invoice.cancelledAt = new Date();
        invoice.cancelledBy = userId;
        await invoice.save();

        return true;
    }

    async getInvoicePdfData(id) {
        const invoice = await Invoice.findById(id);
        if (!invoice) return { message: "Invoice not found", status: 404 };
        return invoice;
    }

    async addInvoicePayment(id, userId, data) {
        const { amount, type = "payment", date, method = "cash" } = data;

        if (!amount || Number(amount) <= 0) {
            return { message: "Valid payment amount required", status: 400 };
        }

        const invoice = await Invoice.findById(id);
        if (!invoice) return { message: "Invoice not found", status: 404 };

        if (invoice.cancelled) {
            return { message: "Cancelled invoice cannot accept payments", status: 400 };
        }

        invoice.payments.push({
            label: type === "advance" ? "Advance" : "Payment",
            amount: Number(amount),
            date: date ? new Date(date) : new Date(),
            method,
            receivedBy: userId || null,
        });

        const paidAmount = invoice.payments.reduce(
            (sum, p) => sum + Number(p.amount || 0),
            0
        );

        invoice.paidAmount = paidAmount;
        invoice.dueAmount = Math.max(0, Number(invoice.total) - paidAmount);
        invoice.status =
            invoice.dueAmount === 0 ? "paid" : paidAmount > 0 ? "partial" : "unpaid";

        await invoice.save();

        const populatedInvoice = await Invoice.findById(invoice._id)
            .populate("createdBy", "name role")
            .populate("payments.receivedBy", "name role")
            .lean();

        return populatedInvoice;
    }

    async getDueInvoices() {
        return Invoice.find({
            cancelled: false,
            dueAmount: { $gt: 0 },
        })
            .sort({ createdAt: -1 })
            .lean();
    }
}

module.exports = new InvoiceService();
