// src/pages/Billing/BillingForm.jsx

import React, { useEffect, useState } from "react";
import { Trash, Printer, Save } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/api";
import toast from "react-hot-toast";

export default function BillingForm() {
    const navigate = useNavigate();
    const location = useLocation();

    /* ================= ROUTE MODE ================= */
    const orderId = new URLSearchParams(location.search).get("orderId");
    const pathId = location.pathname.split("/").pop();
    const isInvoiceMode =
        !orderId && pathId && pathId !== "billing" && pathId !== "new";
    const invoiceId = isInvoiceMode ? pathId : null;

    /* ================= SHOP ================= */
    const SHOP = {
        name: "SNGR Furnitures",
        address: "Old Bus Stand Road, Near Market, Metpally, Telangana",
        phone: "+91 98765 43210",
        logo: "/logo/sngr.png",
    };

    /* ================= STATE ================= */
    const [invoice, setInvoice] = useState(null);

    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const [issuedBy, setIssuedBy] = useState("");

    const [items, setItems] = useState([
        { productId: null, description: "", qty: 1, price: 0 }
    ]);

    const [paymentHistory, setPaymentHistory] = useState([]);

    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [suggestions, setSuggestions] = useState([]);

    const [activeInput, setActiveInput] = useState(null);
    const [query, setQuery] = useState("");

    const invoiceNo = invoice?.invoiceNumber || Date.now();
    const date = new Date().toISOString().slice(0, 10);

    /* ================= INITIAL LOAD ================= */
    useEffect(() => {
        (async () => {
            const p = await api.get("/products");
            const o = await api.get("/orders");
            setProducts(p.data.data || []);
            setOrders(o.data.data || []);
        })();
    }, []);

    /* ================= BUILD SUGGESTIONS ================= */
    useEffect(() => {
        const list = [];

        // ✅ PRODUCTS
        products.forEach((p) =>
            list.push({
                id: `prod_${p._id}`,
                label: p.name,
                price: p.sellPrice || 0,
                productId: p._id,      // 🔥 MUST
                type: "product",
            })
        );

        // ✅ ORDERS (NO productId)
        orders.forEach((o) => {
            (o.drawings || []).forEach((d, i) => {
                list.push({
                    id: `order_${o._id}_${i}`,
                    label: `${d.itemType || ""} - ${d.name || ""}`.trim(),
                    price: Number(o.saleAmount || 0),
                    orderId: o._id,
                    type: "order",
                });
            });
        });

        setSuggestions(list);
    }, [products, orders]);


    /* ================= LOAD ORDER → INVOICE ================= */
    useEffect(() => {
        if (orderId) loadInvoiceFromOrder(orderId);
    }, [orderId]);

    useEffect(() => {
        if (invoiceId) loadInvoiceById(invoiceId);
    }, [invoiceId]);

    const loadInvoiceFromOrder = async (id) => {
        try {
            const invRes = await api.get(`/invoices/generate/${id}`);
            const inv = invRes.data.data || {};
            setInvoice(inv);

            const orderRes = await api.get(`/orders/single/${id}`);
            const order = orderRes.data.data;

            /* BILL TO */
            setCustomerName(inv.customerName || order.customerName || "");
            setCustomerPhone(inv.customerPhone || order.customerPhone || "");
            setCustomerAddress(inv.customerAddress || order.customerAddress || "");
            setIssuedBy(inv.createdBy?.name || "");

            /* ITEMS */
            if (inv.items?.length) {
                setItems(
                    inv.items.map((i) => ({
                        productId: i.productId || null,  // 🔥 ADD THIS
                        description: i.description,
                        qty: i.qty,
                        price: i.rate,
                    }))
                );
            }
            else if (order.drawings?.length) {
                setItems(
                    order.drawings.map((d) => ({
                        description: `${d.itemType} - ${d.name}`,
                        qty: 1,
                        price: Number(order.saleAmount || 0),
                    }))
                );
            } else {
                setItems([{ description: "", qty: 1, price: 0 }]);
            }

            /* PAYMENTS */
            setPaymentHistory(
                (inv.payments || order.payments || []).map((p) => ({
                    label: p.label || (p.type === "advance" ? "Advance" : "Payment"),
                    amount: Number(p.amount || 0),
                    date: p.date || p.createdAt,
                }))
            );
        } catch {
            toast.error("Failed to load invoice from order");
        }
    };

    const loadInvoiceById = async (id) => {
        try {
            const res = await api.get(`/invoices/${id}`);
            const inv = res.data.data;
            if (!inv) return;

            setInvoice(inv);
            setCustomerName(inv.customerName || "");
            setCustomerPhone(inv.customerPhone || "");
            setCustomerAddress(inv.customerAddress || "");
            setIssuedBy(inv.createdBy?.name || "");

            setItems(
                inv.items.map((i) => ({
                    productId: i.productId || null,   // 🔥 ADD THIS
                    description: i.description,
                    qty: i.qty,
                    price: i.rate,
                }))
            );

            setPaymentHistory(inv.payments || []);
        } catch {
            toast.error("Failed to load invoice");
        }
    };

    /* ================= HELPERS ================= */
    const updateItem = (i, patch) => {
        setItems((prev) =>
            prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it))
        );
    };


    const addItem = () =>
        setItems([...items, { productId: null, description: "", qty: 1, price: 0 }]);

    const removeItem = (i) =>
        setItems(items.filter((_, idx) => idx !== i));

    const applySuggestion = (i, s) => {
        updateItem(i, {
            description: s.label,
            price: s.price,
            productId: s.type === "product" ? s.productId : null, // 🔥 FINAL FIX
        });
        setActiveInput(null);
    };



    const updatePayment = (i, patch) => {
        setPaymentHistory((prev) =>
            prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p))
        );
    };

    /* ================= TOTALS ================= */
    const subTotal = items.reduce(
        (s, it) => s + Number(it.qty) * Number(it.price),
        0
    );
    const paid = paymentHistory.reduce((s, p) => s + Number(p.amount || 0), 0);
    const due = Math.max(0, subTotal - paid);

    /* ================= SAVE ================= */
    const saveInvoice = async () => {
        try {
            // ✅ HARD VALIDATION
            for (const it of items) {
                if (!it.productId) {
                    toast.error(
                        `Please select product from list for "${it.description}"`
                    );
                    return;
                }
            }

            // ✅ BUILD PAYLOAD FIRST
            const payload = {
                orderId: invoice?.orderId || null,
                customerName,
                customerPhone,
                customerAddress,
                items: items.map((it) => ({
                    productId: it.productId, // 🔥 MUST BE ObjectId string
                    description: it.description,
                    qty: it.qty,
                    rate: it.price,
                })),
                payments: paymentHistory,
            };

            // ✅ NOW DEBUG (IMPORTANT)
            console.log("🧾 FINAL ITEMS PAYLOAD:", payload.items);
            console.log("🚀 FINAL PAYLOAD:", payload);

            // ✅ API CALL
            if (invoice?._id) {
                await api.put(`/invoices/${invoice._id}`, payload);
            } else {
                await api.post("/invoices", payload);
            }

            toast.success("Invoice saved");
            navigate("/billing");
        } catch (err) {
            console.error("❌ SAVE INVOICE ERROR:", err);
            toast.error("Save failed");
        }
    };



    /* ================= RENDER ================= */
    return (
        <div className="min-h-screen bg-white p-6">
            <div className="max-w-5xl mx-auto border p-6 shadow">
                {/* HEADER */}
                <div className="flex justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">{SHOP.name}</h1>
                        <div>{SHOP.address}</div>
                        <div>{SHOP.phone}</div>
                    </div>
                    <div className="text-right">
                        <img src={SHOP.logo} className="w-24 ml-auto" />
                        <div>Invoice No: {invoiceNo}</div>
                        <div>Date: {date}</div>
                    </div>
                </div>

                {/* BILL TO */}
                <div className="mt-4 border p-3">
                    <input
                        className="border w-full p-1 mb-1"
                        placeholder="Customer Name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                    />
                    <input
                        className="border w-full p-1 mb-1"
                        placeholder="Phone"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                    <input
                        className="border w-full p-1"
                        placeholder="Address"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                    />
                </div>

                {/* ITEMS */}
                <table className="w-full mt-6 border">
                    <thead className="bg-gray-100">
                        <tr>
                            <th>Description</th>
                            <th>Qty</th>
                            <th>Price</th>
                            <th>Amount</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((it, i) => (
                            <tr key={i} className="border-b">
                                <td className="relative">
                                    <input
                                        value={it.description}
                                        className="border p-1 w-full"
                                        onChange={(e) => {
                                            updateItem(i, { description: e.target.value });
                                            setQuery(e.target.value);
                                            setActiveInput(i);
                                        }}
                                        onFocus={() => setActiveInput(i)}
                                    />
                                    {activeInput === i && (
                                        <div className="absolute bg-white border w-full z-10">
                                            {suggestions
                                                .filter((s) =>
                                                    s.label.toLowerCase().includes(query.toLowerCase())
                                                )
                                                .slice(0, 5)
                                                .map((s) => (
                                                    <div
                                                        key={s.id}
                                                        className="p-2 hover:bg-gray-100 cursor-pointer"
                                                        onClick={() => applySuggestion(i, s)}
                                                    >
                                                        {s.label}
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        value={it.qty}
                                        className="border p-1 w-full"
                                        onChange={(e) =>
                                            updateItem(i, { qty: Number(e.target.value) })
                                        }
                                    />
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        value={it.price}
                                        className="border p-1 w-full"
                                        onChange={(e) =>
                                            updateItem(i, { price: Number(e.target.value) })
                                        }
                                    />
                                </td>
                                <td>₹{it.qty * it.price}</td>
                                <td>
                                    <button onClick={() => removeItem(i)}>
                                        <Trash size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <button onClick={addItem} className="mt-2 text-blue-600">
                    + Add Item
                </button>

                {/* PAYMENTS */}
                <div className="mt-6">
                    <h3 className="font-semibold">Payments</h3>
                    {paymentHistory.map((p, i) => (
                        <div key={i} className="flex gap-2 mt-1">
                            <input
                                type="date"
                                value={p.date?.slice(0, 10)}
                                onChange={(e) =>
                                    updatePayment(i, { date: e.target.value })
                                }
                                className="border p-1"
                            />
                            <input
                                value={p.label}
                                onChange={(e) =>
                                    updatePayment(i, { label: e.target.value })
                                }
                                className="border p-1"
                            />
                            <input
                                type="number"
                                value={p.amount}
                                onChange={(e) =>
                                    updatePayment(i, { amount: Number(e.target.value) })
                                }
                                className="border p-1"
                            />
                        </div>
                    ))}
                    <button
                        className="text-blue-600 mt-2"
                        onClick={() =>
                            setPaymentHistory((p) => [
                                { label: "Payment", amount: 0, date: new Date().toISOString() },
                                ...p,
                            ])
                        }
                    >
                        + Add Payment
                    </button>
                </div>

                {/* TOTALS */}
                <div className="text-right mt-6">
                    <div>Total: ₹{subTotal}</div>
                    <div>Paid: ₹{paid}</div>
                    <div className="font-bold">Due: ₹{due}</div>
                </div>


                {/* SIGNATURE / ISSUED BY */}
                <div className="mt-10 text-sm">
                    <div>Issued by,</div>

                    <div className="font-semibold mt-1">
                        {issuedBy || "—"}
                    </div>

                    <div className="mt-6 border-t w-40" />

                    <div className="mt-1 text-gray-600">
                        SNGR Furnitures
                    </div>
                </div>


                {/* ACTIONS */}
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={() => window.print()} className="border px-4 py-2">
                        <Printer size={16} /> Print
                    </button>
                    <button
                        onClick={saveInvoice}
                        className="bg-purple-600 text-white px-4 py-2"
                    >
                        <Save size={16} /> Save Invoice
                    </button>
                </div>
            </div>
        </div>
    );
}
