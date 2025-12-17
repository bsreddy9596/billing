// src/pages/Billing/BillingForm.jsx

import React, { useEffect, useState } from "react";
import { Trash, Printer, Save } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../api/api";
import toast from "react-hot-toast";

export default function BillingForm() {
    const navigate = useNavigate();
    const location = useLocation();

    const orderId = new URLSearchParams(location.search).get("orderId");
    const pathId = location.pathname.split("/").pop();

    const isInvoiceMode =
        !orderId &&
        pathId &&
        pathId !== "billing" &&
        pathId !== "new" &&
        pathId !== "create";

    const invoiceId = isInvoiceMode ? pathId : null;

    const SHOP = {
        name: "SNGR Furnitures",
        address: "Old Bus Stand Road, Near Market, Metpally, Telangana",
        phone: "+91 98765 43210",
        logo: "/logo/sngr.png",
    };

    const [invoice, setInvoice] = useState(null);
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const [invoiceNo] = useState(Date.now());
    const [date] = useState(new Date().toISOString().slice(0, 10));

    const [items, setItems] = useState([{ description: "", qty: 1, price: 0 }]);
    const [paymentHistory, setPaymentHistory] = useState([]);

    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [activeInput, setActiveInput] = useState(null);
    const [query, setQuery] = useState("");

    /* ================= DATA LOAD ================= */

    useEffect(() => {
        (async () => {
            try {
                const p = await api.get("/products");
                setProducts(p.data.data || []);
            } catch { }

            try {
                const o = await api.get("/orders/my");
                setOrders(o.data.data || []);
            } catch { }
        })();
    }, []);

    useEffect(() => {
        const list = [];

        products.forEach((p) =>
            list.push({
                id: `prod_${p._id}`,
                label: p.name,
                price: p.sellPrice || 0,
                productId: p._id,
            })
        );

        orders.forEach((o) => {
            if (Array.isArray(o.drawings)) {
                o.drawings.forEach((d, idx) =>
                    list.push({
                        id: `draw_${o._id}_${idx}`,
                        label: `${d.itemType || ""} - ${d.name || ""}`.trim(),
                        price: Number(o.saleAmount || 0),
                        orderId: o._id,
                    })
                );
            }
        });

        setSuggestions(list);
    }, [products, orders]);

    useEffect(() => {
        if (orderId) loadInvoiceFromOrder(orderId);
    }, [orderId]);

    useEffect(() => {
        if (invoiceId) loadInvoiceById(invoiceId);
    }, [invoiceId]);

    /* ================= LOADERS ================= */

    const loadInvoiceFromOrder = async (id) => {
        try {
            const res = await api.get(`/invoices/generate/${id}`);
            const inv = res.data.data;
            if (!inv) return;

            setInvoice(inv);

            const orderRes = await api.get(`/orders/single/${id}`);
            const order = orderRes.data.data;

            setItems(
                inv.items?.length
                    ? inv.items.map((i) => ({
                        description: i.description,
                        qty: i.qty,
                        price: i.rate,
                    }))
                    : order?.drawings?.length
                        ? order.drawings.map((d) => ({
                            description: `${d.itemType} - ${d.name}`,
                            qty: 1,
                            price: Number(order.saleAmount || 0),
                        }))
                        : []
            );

            setPaymentHistory(
                inv.payments?.length
                    ? inv.payments
                    : order?.payments || []
            );

            setCustomerName(inv.customerName || order.customerName || "");
            setCustomerPhone(inv.customerPhone || order.customerPhone || "");
            setCustomerAddress(inv.customerAddress || order.customerAddress || "");
        } catch {
            toast.error("Invoice load failed");
        }
    };

    const loadInvoiceById = async (id) => {
        try {
            const res = await api.get(`/invoices/${id}`);
            const inv = res.data.data;
            if (!inv) return;

            setInvoice(inv);
            setItems(
                inv.items.map((i) => ({
                    description: i.description,
                    qty: i.qty,
                    price: i.rate,
                }))
            );
            setPaymentHistory(inv.payments || []);
            setCustomerName(inv.customerName || "");
            setCustomerPhone(inv.customerPhone || "");
            setCustomerAddress(inv.customerAddress || "");
        } catch {
            toast.error("Invoice load failed");
        }
    };

    /* ================= ITEM HANDLERS ================= */

    const addItem = () =>
        setItems((p) => [...p, { description: "", qty: 1, price: 0 }]);

    const removeItem = (i) =>
        setItems((p) => p.filter((_, idx) => idx !== i));

    const updateItem = (i, patch) =>
        setItems((p) =>
            p.map((it, idx) =>
                idx === i ? { ...it, ...patch } : it
            )
        );

    const filteredSuggestions = (q) =>
        !q
            ? suggestions.slice(0, 20)
            : suggestions.filter((s) =>
                s.label.toLowerCase().includes(q.toLowerCase())
            );

    const applySuggestion = (i, s) => {
        updateItem(i, {
            description: s.label,
            price: s.price,
            productId: s.productId,
        });
        setActiveInput(null);
    };

    const updatePayment = (i, patch) =>
        setPaymentHistory((p) =>
            p.map((r, idx) => (idx === i ? { ...r, ...patch } : r))
        );

    /* ================= TOTALS ================= */

    const total = items.reduce(
        (s, it) => s + Number(it.qty) * Number(it.price),
        0
    );

    const paidTotal = paymentHistory.reduce(
        (s, p) => s + Number(p.amount || 0),
        0
    );

    const due = Math.max(0, total - paidTotal);

    /* ================= SAVE ================= */

    const saveInvoice = async () => {
        try {
            const payload = {
                orderId: invoice?.orderId || null,
                customerName,
                customerPhone,
                customerAddress,
                items: items.map((it) => ({
                    productId: it.productId || null,
                    description: it.description,
                    qty: Number(it.qty),
                    rate: Number(it.price),
                })),
                tax: 0,
                discount: 0,
                payments: paymentHistory.map(p => ({
                    label: p.label,
                    amount: Number(p.amount),
                    date: p.date,
                })),
            };

            if (invoice?._id) {
                await api.put(`/invoices/${invoice._id}`, payload);
            } else {
                await api.post("/invoices", payload);
            }

            toast.success("Invoice saved!");
            navigate("/billing");
        } catch (err) {
            console.error("SAVE INVOICE ERROR:", err?.response?.data || err);
            toast.error("Save failed");
        }
    };


    const handlePrint = () => window.print();



    return (
        <div className="min-h-screen bg-white p-6 print:p-0">
            <div className="mx-auto max-w-5xl bg-white p-6 border shadow print:border-0 print:shadow-none">

                <div className="flex justify-between items-start">
                    <div className="w-1/2">
                        <h1 className="text-3xl font-extrabold">{SHOP.name}</h1>
                        <div className="text-sm">{SHOP.address}</div>
                        <div className="text-sm mb-4">Phone: {SHOP.phone}</div>

                        <div className="mt-3 bg-gray-50 border p-3 rounded">
                            <div className="font-semibold text-sm mb-1">BILL TO:</div>

                            <input
                                className="text-sm w-full border p-1 mb-1"
                                placeholder="Customer Name"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                            />

                            <input
                                className="text-sm w-full border p-1 mb-1"
                                placeholder="Phone"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                            />

                            <input
                                className="text-sm w-full border p-1"
                                placeholder="Address"
                                value={customerAddress}
                                onChange={(e) => setCustomerAddress(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="w-1/2 text-right">
                        <img src={SHOP.logo} className="w-24 ml-auto" alt="logo" />

                        <div className="mt-4 text-sm">
                            <b>Invoice No:</b> {invoice?.invoiceNumber || invoiceNo}<br />
                            <b>Date:</b> {date}
                        </div>
                    </div>
                </div>

                <div className="text-center mt-6 mb-4 text-xl font-semibold text-purple-600">
                    TAX INVOICE
                </div>

                <table className="w-full border-collapse mt-6">
                    <thead>
                        <tr className="bg-gray-100 text-sm">
                            <th className="p-3 text-left">DESCRIPTION</th>
                            <th className="p-3 text-center w-20">QTY</th>
                            <th className="p-3 text-right w-32">PRICE</th>
                            <th className="p-3 text-right w-32">AMOUNT</th>
                            <th></th>
                        </tr>
                    </thead>

                    <tbody>
                        {items.map((it, i) => (
                            <tr key={i} className="border-b">
                                <td className="p-2">
                                    <div className="relative">
                                        <input
                                            className="w-full border rounded p-2"
                                            value={it.description}
                                            placeholder="Item name…"
                                            onChange={(e) => {
                                                updateItem(i, { description: e.target.value });
                                                setActiveInput(i);
                                                setQuery(e.target.value);
                                            }}
                                            onFocus={() => setActiveInput(i)}
                                        />

                                        {activeInput === i &&
                                            filteredSuggestions(query).length > 0 && (
                                                <div className="absolute z-20 bg-white border w-full rounded shadow max-h-48 overflow-y-auto">
                                                    {filteredSuggestions(query).map((s) => (
                                                        <div
                                                            key={s.id}
                                                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                                            onClick={() => applySuggestion(i, s)}
                                                        >
                                                            {s.label} — ₹{s.price}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                    </div>
                                </td>

                                <td className="text-center p-2">
                                    <input
                                        type="number"
                                        min="1"
                                        className="border rounded p-1 w-full text-center"
                                        value={it.qty}
                                        onChange={(e) => updateItem(i, { qty: e.target.value })}
                                    />
                                </td>

                                <td className="text-right p-2">
                                    <input
                                        type="number"
                                        className="border rounded p-1 w-full text-right"
                                        value={it.price}
                                        onChange={(e) => updateItem(i, { price: e.target.value })}
                                    />
                                </td>

                                <td className="text-right p-2 font-semibold">
                                    ₹ {(it.qty * it.price).toFixed(2)}
                                </td>

                                <td className="text-center">
                                    <button onClick={() => removeItem(i)}>
                                        <Trash size={16} className="text-red-600" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <button className="text-indigo-600 mt-2" onClick={addItem}>
                    + Add Item
                </button>

                <div className="mt-6">
                    <div className="text-sm font-semibold mb-1">Payment History</div>

                    <table className="w-full text-sm border">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="p-2 border">DATE</th>
                                <th className="p-2 border">PAYMENT</th>
                                <th className="p-2 border text-right">AMOUNT</th>
                                <th className="p-2 border"></th>
                            </tr>
                        </thead>

                        <tbody>
                            {paymentHistory.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-2 text-center text-gray-500">
                                        No payments
                                    </td>
                                </tr>
                            ) : (
                                paymentHistory.map((p, i) => (
                                    <tr key={i}>
                                        <td className="p-2 border">
                                            <input
                                                type="date"
                                                value={p.date?.slice(0, 10) || ""}
                                                onChange={(e) =>
                                                    updatePayment(i, { date: e.target.value })
                                                }
                                                className="border rounded p-1 w-full"
                                            />
                                        </td>

                                        <td className="p-2 border">
                                            <input
                                                className="border rounded p-1 w-full"
                                                value={p.label}
                                                onChange={(e) =>
                                                    updatePayment(i, { label: e.target.value })
                                                }
                                            />
                                        </td>

                                        <td className="p-2 border text-right">
                                            <input
                                                type="number"
                                                className="border rounded p-1 w-full text-right"
                                                value={p.amount}
                                                onChange={(e) =>
                                                    updatePayment(i, {
                                                        amount: Number(e.target.value),
                                                    })
                                                }
                                            />
                                        </td>

                                        <td className="p-2 border text-center">
                                            <button
                                                onClick={() =>
                                                    setPaymentHistory((prev) =>
                                                        prev.filter((_, idx) => idx !== i)
                                                    )
                                                }
                                                className="text-red-600"
                                            >
                                                <Trash size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    <button
                        className="text-indigo-600 text-sm mt-2"
                        onClick={() =>
                            setPaymentHistory((prev) => [
                                ...prev,
                                {
                                    label: "Payment",
                                    amount: 0,
                                    date: new Date().toISOString(),
                                },
                            ])
                        }
                    >
                        + Add Payment
                    </button>
                </div>

                <div className="flex justify-end mt-8">
                    <div className="w-1/3 text-right">
                        <div className="text-lg font-bold">
                            Total: ₹ {total.toLocaleString()}
                        </div>
                        <div className="text-green-600 mt-2 font-semibold">
                            Paid: ₹ {paidTotal.toLocaleString()}
                        </div>
                        <div className="text-red-600 font-bold mt-3">
                            Due: ₹ {due.toLocaleString()}
                        </div>
                    </div>
                </div>

                <div className="mt-10 flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                        Issued by, signature
                        <div className="mt-6 font-semibold">{SHOP.name}</div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handlePrint}
                            className="border px-4 py-2 rounded flex items-center gap-2"
                        >
                            <Printer size={16} /> Print
                        </button>

                        <button
                            onClick={saveInvoice}
                            className="bg-purple-600 text-white px-4 py-2 rounded flex items-center gap-2"
                        >
                            <Save size={16} /> Save Invoice
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .min-h-screen, .min-h-screen * { visibility: visible; }
                    .min-h-screen { position: absolute; left: 0; top: 0; width: 100%; }
                    button, input { display: none !important; }
                }
            `}</style>
        </div>
    );
}
