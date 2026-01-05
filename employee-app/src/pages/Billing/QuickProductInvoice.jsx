import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/api";
import toast from "react-hot-toast";
import { Plus, Trash2, Printer, Save, ArrowLeft } from "lucide-react";

const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN");
const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

export default function BillingForm() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const editId = params.get("edit");

    const invoiceRef = useRef(null);

    const SHOP = {
        name: "SNGR Furnitures",
        address: "Old Bus Stand Road, Metpally",
        phone: "+91 9640044469",
        logo: "/logo/logo.png",
    };

    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");

    const [items, setItems] = useState([
        { description: "", qty: 1, rate: 0, productId: null },
    ]);

    const [payments, setPayments] = useState([]);
    const [products, setProducts] = useState([]);
    const [query, setQuery] = useState("");
    const [activeRow, setActiveRow] = useState(null);
    const [saving, setSaving] = useState(false);

    const invoiceDate = new Date();

    useEffect(() => {
        api.get("/products").then((res) => {
            setProducts(res.data.data || []);
        });
    }, []);

    useEffect(() => {
        if (!editId) return;

        api.get(`/invoices/${editId}`).then((res) => {
            const inv = res.data.data;

            setCustomerName(inv.customerName);
            setCustomerPhone(inv.customerPhone || "");
            setCustomerAddress(inv.customerAddress || "");

            setItems(
                inv.items.map((i) => ({
                    description: i.description,
                    qty: i.qty,
                    rate: i.rate,
                    productId: i.productId,
                }))
            );
        });
    }, [editId]);

    const updateItem = (i, patch) => {
        setItems((prev) =>
            prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it))
        );
    };

    const addItem = () =>
        setItems([
            ...items,
            { description: "", qty: 1, rate: 0, productId: null },
        ]);

    const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));

    const applyProduct = (i, p) => {
        const rate = p.sellPrice ?? p.salePrice ?? p.price ?? 0;

        updateItem(i, {
            description: `${p.name}${p.brand ? ` (${p.brand})` : ""}`,
            rate,
            productId: p._id,
            qty: 1,
        });

        setActiveRow(null);
        setQuery("");
    };

    const updatePayment = (i, patch) => {
        setPayments((prev) =>
            prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p))
        );
    };

    const addPayment = () =>
        setPayments([
            ...payments,
            {
                date: new Date().toISOString().slice(0, 10),
                label: "Payment",
                amount: 0,
                method: "cash",
            },
        ]);

    const removePayment = (i) =>
        setPayments(payments.filter((_, idx) => idx !== i));

    const total = items.reduce(
        (s, it) => s + Number(it.qty) * Number(it.rate),
        0
    );

    const paid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const due = Math.max(0, total - paid);

    const saveInvoice = async () => {
        if (!customerName.trim()) return toast.error("Customer name required");

        for (const it of items) {
            if (!it.productId) return toast.error("Select product from list");
            if (it.qty <= 0) return toast.error("Invalid quantity");
            if (it.rate <= 0) return toast.error("Invalid rate");
        }

        setSaving(true);
        try {
            const res = await api.post("/invoices/product", {
                customerName,
                customerPhone,
                customerAddress,
                items: items.map((i) => ({
                    productId: i.productId,
                    qty: i.qty,
                    rate: i.rate,
                })),
                payments: payments
                    .filter((p) => p.amount > 0)
                    .map((p) => ({
                        label: p.label,
                        amount: p.amount,
                        date: p.date,
                        method: p.method,
                    })),
            });

            toast.success("Invoice created");
            navigate(`/invoice/product/${res.data.data._id}`);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to save invoice");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-gray-100 min-h-screen p-6">
            <div className="max-w-3xl mx-auto flex justify-between mb-4">
                <button
                    onClick={() => navigate(-1)}
                    className="px-3 py-1 border rounded bg-white text-sm flex gap-2"
                >
                    <ArrowLeft size={14} /> Back
                </button>
                <button
                    onClick={() => window.print()}
                    className="px-3 py-1 border rounded bg-white text-sm flex gap-2"
                >
                    <Printer size={14} /> Print
                </button>
            </div>

            <div
                ref={invoiceRef}
                className="relative max-w-3xl mx-auto bg-white rounded-xl shadow p-6 text-sm"
            >
                <div className="flex justify-between mb-4">
                    <div className="flex gap-3">
                        <img src={SHOP.logo} className="h-14" />
                        <div>
                            <h1 className="text-lg font-bold">{SHOP.name}</h1>
                            <div className="text-gray-500">{SHOP.address}</div>
                            <div className="text-gray-500">{SHOP.phone}</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div>Date: {fmtDate(invoiceDate)}</div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                    <input className="border p-1" placeholder="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                    <input className="border p-1" placeholder="Phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                    <input className="border p-1" placeholder="Address" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
                </div>

                <table className="w-full border text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th>Description</th>
                            <th>Qty</th>
                            <th>Rate</th>
                            <th>Amount</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((it, i) => (
                            <tr key={i}>
                                <td className="relative border p-1">
                                    <input
                                        className="w-full"
                                        value={it.description}
                                        onChange={(e) => {
                                            setQuery(e.target.value);
                                            setActiveRow(i);
                                            updateItem(i, { description: e.target.value, productId: null });
                                        }}
                                        onFocus={() => setActiveRow(i)}
                                    />
                                    {activeRow === i && query && (
                                        <div className="absolute bg-white border w-full z-20 max-h-40 overflow-auto">
                                            {products
                                                .filter((p) =>
                                                    `${p.name} ${p.brand || ""}`.toLowerCase().includes(query.toLowerCase())
                                                )
                                                .slice(0, 6)
                                                .map((p) => (
                                                    <div
                                                        key={p._id}
                                                        onClick={() => applyProduct(i, p)}
                                                        className="p-2 hover:bg-gray-100 cursor-pointer"
                                                    >
                                                        <div className="font-medium">
                                                            {p.name} {p.brand && `(${p.brand})`}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            ₹{p.sellPrice ?? p.salePrice ?? p.price ?? 0} | Avl: {p.stockQty}
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </td>
                                <td className="border p-1">
                                    <input type="number" min="1" className="w-14" value={it.qty} onChange={(e) => updateItem(i, { qty: Number(e.target.value) })} />
                                </td>
                                <td className="border p-1">
                                    <input type="number" className="w-20" value={it.rate} onChange={(e) => updateItem(i, { rate: Number(e.target.value) })} />
                                </td>
                                <td className="border p-1">{money(it.qty * it.rate)}</td>
                                <td className="border p-1 text-center">
                                    <button onClick={() => removeItem(i)}>
                                        <Trash2 size={12} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <button onClick={addItem} className="mt-2 text-[#0e9a86] flex items-center gap-1">
                    <Plus size={12} /> Add Item
                </button>

                <h3 className="mt-6 font-semibold">Payments</h3>
                {payments.map((p, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2 mt-2">
                        <input type="date" className="border p-1" value={p.date} onChange={(e) => updatePayment(i, { date: e.target.value })} />
                        <select className="border p-1" value={p.label} onChange={(e) => updatePayment(i, { label: e.target.value })}>
                            <option value="Advance">Advance</option>
                            <option value="Payment">Payment</option>
                        </select>
                        <input type="number" className="border p-1" value={p.amount} onChange={(e) => updatePayment(i, { amount: Number(e.target.value) })} />
                        <button onClick={() => removePayment(i)}>
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}

                <button onClick={addPayment} className="mt-2 text-[#0e9a86]">
                    + Add Payment
                </button>

                <div className="mt-6 text-right">
                    <div>Total: {money(total)}</div>
                    <div className="text-green-600">Paid: {money(paid)}</div>
                    <div className="font-bold text-red-600">Due: {money(due)}</div>
                </div>

                <div className="mt-4 flex justify-end">
                    <button
                        disabled={saving}
                        onClick={saveInvoice}
                        className="bg-[#0e9a86] text-white px-4 py-2 rounded flex gap-2"
                    >
                        <Save size={14} /> {saving ? "Saving..." : "Save Invoice"}
                    </button>
                </div>
            </div>
        </div>
    );
}
