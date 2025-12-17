// src/pages/OrderDetails.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/api";
import toast, { Toaster } from "react-hot-toast";
import {
    ArrowLeft,
    User,
    Phone,
    ImageIcon,
    Tag,
    Edit2,
    Trash2,
    Printer,
    Calendar,
    Wallet,
    Layers,
} from "lucide-react";


const fmtDate = (iso) => {
    if (!iso) return "-";
    try {
        const d = typeof iso === "number" ? new Date(iso) : new Date(iso);
        if (isNaN(d.getTime())) return String(iso);
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yy = d.getFullYear();
        return `${dd}/${mm}/${yy}`;
    } catch {
        return String(iso);
    }
};

const resolveDate = (entry, fallbackDate = null) => {
    if (!entry) return "-";
    if (entry.createdAt) return fmtDate(entry.createdAt);
    if (entry.updatedAt) return fmtDate(entry.updatedAt);
    if (entry.date) return fmtDate(entry.date);

    // Try to decode ObjectId timestamp
    if (entry._id && typeof entry._id === "string") {
        try {
            if (/^[a-fA-F0-9]{24}$/.test(entry._id)) {
                const ts = parseInt(entry._id.substring(0, 8), 16) * 1000;
                return fmtDate(ts);
            }
        } catch { }
    }

    if (fallbackDate) return fmtDate(fallbackDate);
    return fmtDate(Date.now());
};

const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    processing: "bg-indigo-100 text-indigo-800",
    ready_for_delivery: "bg-green-100 text-green-800",
    delivered: "bg-green-200 text-green-900",
    completed: "bg-gray-100 text-gray-800",
};

/* ---------- MAIN COMPONENT ---------- */
export default function OrderDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    // get role from localStorage (fallback to employee)
    let savedUser = {};
    try {
        savedUser = JSON.parse(localStorage.getItem("user") || "{}");
    } catch { }
    const role = (savedUser.role || "employee").toLowerCase();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    // UI states
    const [drawingModal, setDrawingModal] = useState(null);
    const [expenseModalOpen, setExpenseModalOpen] = useState(false);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);

    // forms
    const [expenseForm, setExpenseForm] = useState({
        type: "labour",
        label: "",
        amount: "",
        note: "",
        _id: null,
    });
    const [paymentForm, setPaymentForm] = useState({
        type: "advance",
        amount: "",
        note: "",
        _id: null,
    });

    // materials UI
    const [materialList, setMaterialList] = useState([]);
    const [showAddMaterialForm, setShowAddMaterialForm] = useState(false);
    const [addMaterialForm, setAddMaterialForm] = useState({
        materialId: "",
        quantity: "",
        note: "",
    });
    const [editMaterialModal, setEditMaterialModal] = useState(null);
    const [editMaterialForm, setEditMaterialForm] = useState({
        quantity: "",
        note: "",
    });

    useEffect(() => {
        loadOrder();
        loadMaterialList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    /* ----------------- LOADS ----------------- */
    async function loadOrder() {
        setLoading(true);

        try {
            const res = await api.get(`/orders/single/${id}`);

            const apiData = res.data.data || {};

            // ⭐ Take payments from API (order.payments is NOT used anymore)
            apiData.payments = res.data.data.payments || [];

            // fallback defaults
            apiData.expenses = apiData.expenses || [];
            apiData.materialsUsed = apiData.materialsUsed || [];
            apiData.drawings = apiData.drawings || [];

            setOrder(apiData);
        } catch (err) {
            toast.error("Order not found");
            setOrder(null);
        } finally {
            setLoading(false);
        }
    }




    async function loadMaterialList() {
        try {
            const res = await api.get("/materials");
            setMaterialList(res.data.data || []);
        } catch { }
    }

    /* ----------------- COMPUTED TOTALS ----------------- */
    const totals = useMemo(() => {
        if (!order)
            return {
                totalMaterials: 0,
                totalExpenses: 0,
                paid: 0,
                due: 0,
                sale: 0,
                profit: 0,
            };

        const totalMaterials = (order.materialsUsed || []).reduce((s, m) => {
            const rate = Number(m.costPerUnit ?? m.materialId?.costPerUnit ?? 0);
            return s + rate * Number(m.quantity || 0);
        }, 0);

        const totalExpenses = (order.expenses || []).reduce((s, e) => s + Number(e.amount || 0), 0);
        const paid = (order.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
        const sale = Number(order.saleAmount || 0);
        const due = Math.max(0, sale - paid);
        const profit = sale - totalMaterials - totalExpenses;

        return { totalMaterials, totalExpenses, paid, due, sale, profit };
    }, [order]);

    /* sort helpers */
    const dateForSort = (x) => {
        if (!x) return 0;
        if (x.createdAt) return new Date(x.createdAt).getTime() || 0;
        if (x.updatedAt) return new Date(x.updatedAt).getTime() || 0;
        if (x.date) return new Date(x.date).getTime() || 0;
        if (x._id && typeof x._id === "string") {
            try {
                return parseInt(x._id.substring(0, 8), 16) * 1000;
            } catch {
                return 0;
            }
        }
        return 0;
    };

    const paymentsNewestFirst = (order?.payments || []).slice().sort((a, b) => dateForSort(b) - dateForSort(a));
    const expensesNewestFirst = (order?.expenses || []).slice().sort((a, b) => dateForSort(b) - dateForSort(a));

    /* ----------------- ACTIONS ----------------- */

    // update status
    const updateStatus = async (newStatus) => {
        try {
            await api.put(`/orders/${id}/status`, { status: newStatus });
            toast.success("Status updated");
            await loadOrder();
        } catch {
            toast.error("Failed to update status");
        }
    };

    /* expenses */
    const addOrEditExpense = async (e) => {
        e.preventDefault();
        const payload = {
            type: expenseForm.type,
            label: expenseForm.label,
            amount: Number(expenseForm.amount),
            note: expenseForm.note,
        };
        try {
            if (expenseForm._id) {
                await api.put(`/orders/${id}/expense/${expenseForm._id}`, payload);
            } else {
                await api.put(`/orders/${id}/expense`, payload);
            }
            setExpenseModalOpen(false);
            await loadOrder();
            toast.success("Saved");
        } catch {
            toast.error("Failed to save expense");
        }
    };

    const deleteExpense = async (expenseId) => {
        if (!confirm("Delete expense?")) return;
        try {
            await api.delete(`/orders/${id}/expense/${expenseId}`);
            await loadOrder();
            toast.success("Deleted");
        } catch {
            toast.error("Failed to delete expense");
        }
    };


    /* payments */
    const addOrEditPayment = async (e) => {
        e.preventDefault();

        const payload = {
            amount: Number(paymentForm.amount),
            type: paymentForm.type,
            note: paymentForm.note,
            method: "cash",
        };

        try {
            if (paymentForm._id) {
                // EDIT payment
                await api.put(`/orders/${id}/payments/${paymentForm._id}`, payload);
            } else {
                // ADD payment
                await api.post(`/orders/${id}/payments`, payload);
            }

            setPaymentModalOpen(false);
            await loadOrder();
            toast.success("Saved");
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed");
        }
    };



    const deletePayment = async (paymentId) => {
        if (!confirm("Delete payment?")) return;

        try {
            await api.delete(`/orders/${id}/payments/${paymentId}`);
            await loadOrder();
            toast.success("Deleted");
        } catch {
            toast.error("Failed to delete payment");
        }
    };


    /* materials */
    const handleAddMaterial = async (e) => {
        e.preventDefault();
        if (!addMaterialForm.materialId) return toast.error("Select material");
        if (!addMaterialForm.quantity || Number(addMaterialForm.quantity) <= 0) return toast.error("Enter valid quantity");
        const payload = {
            materials: [{ materialId: addMaterialForm.materialId, quantity: Number(addMaterialForm.quantity), note: addMaterialForm.note || "" }],
        };
        try {
            const res = await api.put(`/orders/${id}/materials`, payload);
            setOrder(res.data.data);
            setAddMaterialForm({ materialId: "", quantity: "", note: "" });
            setShowAddMaterialForm(false);
            toast.success("Material added");
        } catch (err) {
            const msg = err?.response?.data?.message || "Failed to add material";
            toast.error(msg);
        }
    };

    const openEditMaterial = (usage) => {
        setEditMaterialModal(usage);
        setEditMaterialForm({ quantity: usage.quantity, note: usage.note || "" });
    };

    const submitEditMaterial = async (e) => {
        e.preventDefault();
        if (!editMaterialModal) return;
        const usageId = editMaterialModal._id;
        const payload = { quantity: Number(editMaterialForm.quantity), note: editMaterialForm.note || "" };
        try {
            const res = await api.put(`/orders/${id}/materials/${usageId}`, payload);
            setOrder(res.data.data);
            setEditMaterialModal(null);
            toast.success("Material updated");
        } catch {
            toast.error("Failed to update material");
        }
    };

    const deleteMaterial = async (usage) => {
        if (!confirm("Delete this material usage?")) return;
        try {
            const res = await api.delete(`/orders/${id}/materials/${usage._id}`);
            setOrder(res.data.data);
            toast.success("Material removed");
        } catch {
            toast.error("Failed to delete material");
        }
    };


    /* ---------- RENDER ---------- */
    if (loading) return <div className="p-10 text-center">Loading...</div>;
    if (!order) return <div className="p-10 text-center text-red-500">Order Not Found</div>;

    const showFull = ["confirmed", "processing", "ready_for_delivery", "delivered", "completed"].includes(order.status);

    return (
        <div className="p-6 bg-gradient-to-b from-white to-[#F7FFFC] min-h-screen space-y-6">
            <Toaster position="top-right" />

            {/* header row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-100 rounded">Back</button>

                    <button
                        onClick={() => navigate(`/billing/new?orderId=${order._id}`)}
                        className="px-4 py-2 bg-white border rounded shadow"
                    >
                        Invoice
                    </button>





                </div>
            </div>

            {/* main header */}
            <div className="bg-gradient-to-r from-[#0f9f8b] to-[#0c8f77] text-white p-6 rounded-2xl shadow-lg flex flex-col md:flex-row md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded"><User size={26} /></div>
                        {order.customerName || "Walk-in Customer"}
                    </h1>
                    <div className="mt-2 flex items-center gap-4 text-white/90"><Phone size={16} /> {order.customerPhone || "-"}</div>
                </div>

                <div className="text-right">
                    <div className="text-sm">Address</div>
                    <div className="font-medium">{order.customerAddress || "—"}</div>
                    <div className="mt-3 text-sm">Order#: <span className="font-semibold">{order._id}</span></div>
                    <div className="text-sm">Date: {fmtDate(order.createdAt)}</div>
                </div>
            </div>

            {/* pending minimal */}
            {
                !showFull && (
                    <div className="bg-white p-6 rounded-2xl shadow border animate-fade-in">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><ImageIcon size={18} className="text-pink-500" /> Drawings</h2>
                        {order.drawings.length === 0 && <div className="text-gray-500 italic">No drawings uploaded.</div>}
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {order.drawings.map((d, idx) => (
                                <div key={d._id ?? d.drawingUrl ?? `drawing-${idx}`} className="border rounded-xl p-3 bg-gray-50 cursor-pointer hover:shadow-md transition" onClick={() => setDrawingModal(d.drawingUrl)}>
                                    <img src={d.drawingUrl} alt={d.itemType} className="w-full h-40 object-contain rounded mb-2" />
                                    <div className="font-semibold">{d.itemType || d.name}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* full view */}
            {
                showFull && (
                    <>
                        {/* 3 cards */}
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Cost */}
                            <div className="bg-white rounded-2xl shadow-md p-5 transform hover:-translate-y-1 transition">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-gradient-to-br from-[#E6FFFB] to-[#EEFFF6] p-2 rounded"><Layers size={20} className="text-[#0ea58f]" /></div>
                                        <div>
                                            <div className="text-sm text-gray-500">Cost Breakdown</div>
                                            <div className="font-bold text-lg">Materials & Expenses</div>
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-400">{order.materialsUsed.length} items</div>
                                </div>

                                <div className="mt-4 space-y-2 text-gray-700">
                                    <div className="flex justify-between"><span>Material Cost</span><span className="font-semibold">₹{totals.totalMaterials.toLocaleString()}</span></div>
                                    <div className="flex justify-between"><span>Labour Cost</span><span className="font-semibold">₹{order.expenses.filter((e) => e.type === "labour").reduce((a, b) => a + Number(b.amount), 0).toLocaleString()}</span></div>
                                    <div className="flex justify-between"><span>Other Expenses</span><span className="font-semibold">₹{order.expenses.filter((e) => e.type !== "labour").reduce((a, b) => a + Number(b.amount), 0).toLocaleString()}</span></div>
                                    <div className="border-t mt-3 pt-3 flex justify-between text-[#0e9a86] font-bold"><span>Total Cost</span><span>₹{(totals.totalMaterials + totals.totalExpenses).toLocaleString()}</span></div>
                                </div>
                            </div>

                            {/* Payments */}
                            <div className="bg-white rounded-2xl shadow-md p-5 transform hover:-translate-y-1 transition">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-gradient-to-br from-[#F7FFF9] to-[#F1FFFC] p-2 rounded"><Wallet size={20} className="text-[#0e9a86]" /></div>
                                        <div>
                                            <div className="text-sm text-gray-500">Payments</div>
                                            <div className="font-bold text-lg">Received & Advances</div>
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-400">{paymentsNewestFirst.length} entries</div>
                                </div>

                                <div className="mt-4 space-y-3">
                                    <div className="grid grid-cols-3 text-sm gap-2">
                                        {/* Advance */}
                                        <div>
                                            <div className="text-gray-500">Advance</div>
                                            <div className="font-semibold text-green-700">₹{order.payments.filter((p) => p.type === "advance").reduce((a, b) => a + Number(b.amount), 0).toLocaleString()}</div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                {resolveDate((order.payments || []).filter((p) => p.type === "advance").slice().sort((a, b) => dateForSort(b) - dateForSort(a))[0])}
                                            </div>
                                        </div>

                                        {/* Payments */}
                                        <div>
                                            <div className="text-gray-500">Payments</div>
                                            <div className="font-semibold text-gray-800">₹{order.payments.filter((p) => p.type === "payment").reduce((a, b) => a + Number(b.amount), 0).toLocaleString()}</div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                {resolveDate((order.payments || []).filter((p) => p.type === "payment").slice().sort((a, b) => dateForSort(b) - dateForSort(a))[0])}
                                            </div>
                                        </div>

                                        {/* Due */}
                                        <div>
                                            <div className="text-gray-500">Due</div>
                                            <div className="font-semibold text-red-600">₹{totals.due.toLocaleString()}</div>
                                            <div className="text-xs text-gray-400 mt-1">{resolveDate(paymentsNewestFirst[0])}</div>
                                        </div>
                                    </div>

                                    <div className="mt-3 border-t pt-2 max-h-40 overflow-auto space-y-2">
                                        {paymentsNewestFirst.map((p, index) => (
                                            <div key={p._id ?? p.createdAt ?? `payment-${index}`} className="flex items-center justify-between p-2 rounded hover:bg-gray-50 transition">
                                                <div className="flex items-center gap-3">
                                                    <div className="text-sm text-gray-600 flex items-center gap-2"><Calendar size={14} /> {resolveDate(p)}</div>
                                                    <div className="text-sm">
                                                        <div className="font-medium">{p.type === "advance" ? "Advance" : "Payment"}</div>
                                                        {p.note && <div className="text-xs text-gray-500">{p.note}</div>}
                                                    </div>
                                                </div>
                                                <div className="font-semibold">₹{Number(p.amount).toLocaleString()}</div>
                                            </div>
                                        ))}

                                        {paymentsNewestFirst.length === 0 && <div className="text-gray-500 italic p-2">No payments recorded.</div>}
                                    </div>
                                </div>
                            </div>

                            {/* Sale & Profit */}
                            <div className="bg-white rounded-2xl shadow-md p-5 transform hover:-translate-y-1 transition">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-gradient-to-br from-[#F6FFF9] to-[#EFFFF4] p-2 rounded"><Layers size={20} className="text-[#0e9a86]" /></div>
                                        <div>
                                            <div className="text-sm text-gray-500">Sale & Profit</div>
                                            <div className="font-bold text-lg">Revenue Summary</div>
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-400">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs ${statusColors[order.status] || "bg-gray-100 text-gray-700"}`}>
                                            {order.status.replace(/_/g, " ")}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-4 space-y-3">
                                    <div className="flex justify-between"><span>Sale Amount</span><span className="font-semibold text-green-700">₹{totals.sale.toLocaleString()}</span></div>
                                    <div className="flex justify-between"><span>Profit / Loss</span><span className={`font-bold ${totals.profit >= 0 ? "text-green-600" : "text-red-600"}`}>₹{totals.profit.toLocaleString()}</span></div>
                                    <div className="mt-3 text-sm text-gray-500">Paid: ₹{totals.paid.toLocaleString()} · Materials: ₹{totals.totalMaterials.toLocaleString()}</div>
                                </div>
                            </div>
                        </div>

                        {/* drawings */}
                        <div className="bg-white p-6 rounded-2xl shadow border">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <ImageIcon size={18} className="text-pink-500" /> Drawings
                            </h2>

                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {order.drawings.map((d, idx) => (
                                    <div
                                        key={d._id ?? d.drawingUrl ?? `drawing-full-${idx}`}
                                        className="border rounded-xl p-3 bg-gray-50 cursor-pointer hover:shadow-md transition"
                                        onClick={() => d.drawingUrl && setDrawingModal(d.drawingUrl)}
                                    >
                                        {d.drawingUrl ? (
                                            <img
                                                src={d.drawingUrl}
                                                alt={d.itemType}
                                                className="w-full h-40 object-contain rounded mb-2"
                                            />
                                        ) : (
                                            <div className="w-full h-40 flex items-center justify-center bg-gray-100 rounded mb-2 text-gray-500">
                                                No Image
                                            </div>
                                        )}

                                        <div className="font-semibold">{d.itemType || d.name}</div>
                                    </div>
                                ))}
                            </div>
                        </div>


                        {/* materials table */}
                        <div className="bg-white p-6 rounded-2xl shadow border">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-bold text-lg flex items-center gap-2"><Tag className="text-green-600" /> Materials Used</h2>
                                {(role === "employee" || role === "admin") && (
                                    <button onClick={() => setShowAddMaterialForm((s) => !s)} className="px-3 py-1 bg-[#0e9a86] text-white rounded shadow-sm">
                                        {showAddMaterialForm ? "Close" : "+ Add Material"}
                                    </button>
                                )}
                            </div>

                            {showAddMaterialForm && (role === "employee" || role === "admin") && (
                                <form onSubmit={handleAddMaterial} className="p-4 bg-gray-50 rounded-xl border mb-4">
                                    <div className="grid md:grid-cols-4 gap-3">
                                        <select className="border rounded px-3 py-2" required value={addMaterialForm.materialId} onChange={(e) => setAddMaterialForm({ ...addMaterialForm, materialId: e.target.value })}>
                                            <option value="">Select material</option>
                                            {materialList.map((m) => (
                                                <option key={m._id} value={m._id}>
                                                    {m.name} — ₹{m.costPerUnit} (Avail: {m.availableQty})
                                                </option>
                                            ))}
                                        </select>

                                        <input type="number" required placeholder="Quantity" className="border rounded px-3 py-2" value={addMaterialForm.quantity} onChange={(e) => setAddMaterialForm({ ...addMaterialForm, quantity: e.target.value })} />
                                        <input type="text" placeholder="Note" className="border rounded px-3 py-2" value={addMaterialForm.note} onChange={(e) => setAddMaterialForm({ ...addMaterialForm, note: e.target.value })} />
                                        <button className="bg-[#0e9a86] text-white px-4 py-2 rounded">Add</button>
                                    </div>
                                </form>
                            )}

                            {order.materialsUsed.length === 0 ? (
                                <div className="text-gray-500">No materials used.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm border rounded-xl overflow-hidden">
                                        <thead className="bg-[#F0FFF7] text-[#0e9a86]">
                                            <tr>
                                                <th className="p-3 text-left">Material</th>
                                                <th className="p-3 text-center">Qty</th>
                                                <th className="p-3 text-center">Rate</th>
                                                <th className="p-3 text-center">Total</th>
                                                <th className="p-3 text-left">Note</th>
                                                <th className="p-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(order.materialsUsed || []).map((m, i) => {
                                                const rate = Number(m.costPerUnit ?? m.materialId?.costPerUnit ?? 0);
                                                const total = rate * Number(m.quantity || 0);
                                                return (
                                                    <tr key={m._id ?? `mat-${i}`} className={`border-b ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                                                        <td className="p-3">{m.materialId?.name || m.name}</td>
                                                        <td className="p-3 text-center">{m.quantity}</td>
                                                        <td className="p-3 text-center">₹{rate}</td>
                                                        <td className="p-3 text-center font-semibold text-green-700">₹{total}</td>
                                                        <td className="p-3">{m.note}</td>
                                                        <td className="p-3 text-right">
                                                            {(role === "employee" || role === "admin") && (
                                                                <div className="flex gap-2 justify-end">
                                                                    <button className="p-2 bg-white border rounded" title="Edit" onClick={() => openEditMaterial(m)}><Edit2 size={14} /></button>
                                                                    <button className="p-2 bg-white border rounded" title="Delete" onClick={() => deleteMaterial(m)}><Trash2 size={14} /></button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* bottom lists: expenses & payments */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-white p-6 rounded-2xl shadow border">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-bold text-lg">Expenses</h3>
                                    {role === "admin" && <button className="px-3 py-1 bg-red-50 text-red-600 rounded" onClick={() => setExpenseModalOpen(true)}>+ Add Expense</button>}
                                </div>

                                {expensesNewestFirst.length === 0 && <div className="text-gray-400 italic">No expenses.</div>}
                                <div className="space-y-2">
                                    {expensesNewestFirst.map((e, idx) => (
                                        <div key={e._id ?? `exp-${idx}`} className="border p-3 rounded flex justify-between items-center">
                                            <div>
                                                <div className="font-semibold">{e.label || e.type}</div>
                                                {e.note && <div className="text-xs text-gray-600">{e.note}</div>}
                                                <div className="text-xs text-gray-500">{resolveDate(e)}</div>
                                            </div>
                                            <div className="flex gap-2 items-center">
                                                <div className="font-semibold">₹{e.amount}</div>
                                                {role === "admin" && (
                                                    <>
                                                        <button className="p-2 bg-white border rounded" onClick={() => { setExpenseForm({ type: e.type, label: e.label, amount: e.amount, note: e.note, _id: e._id }); setExpenseModalOpen(true); }} title="Edit expense"><Edit2 size={14} /></button>
                                                        <button className="p-2 bg-white border rounded" onClick={() => deleteExpense(e._id)} title="Delete expense"><Trash2 size={14} /></button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow border">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-bold text-lg">Payments</h3>
                                    {role === "admin" && <button className="px-3 py-1 bg-[#0e9a86] text-white rounded" onClick={() => setPaymentModalOpen(true)}>+ Add Payment</button>}
                                </div>

                                {paymentsNewestFirst.length === 0 && <div className="text-gray-400 italic">No payments.</div>}
                                <div className="space-y-2 max-h-[210px] overflow-y-auto pr-1">
                                    {paymentsNewestFirst.map((p, idx) => {

                                        return (
                                            <div
                                                key={p._id ?? `pay-${idx}`}
                                                className="border p-3 rounded flex justify-between items-center"
                                            >
                                                <div>
                                                    <div className="font-semibold">
                                                        {p.type === "advance" ? "Advance" : "Payment"}
                                                    </div>
                                                    {p.note && <div className="text-xs text-gray-600">{p.note}</div>}
                                                    <div className="text-xs text-gray-500">{resolveDate(p)}</div>
                                                </div>

                                                <div className="flex gap-2 items-center">
                                                    <div className="font-semibold">₹{p.amount}</div>

                                                    {role === "admin" && (
                                                        <>
                                                            <button
                                                                className="p-2 bg-white border rounded"
                                                                onClick={() => {
                                                                    setPaymentForm({
                                                                        type: p.type,
                                                                        amount: p.amount,
                                                                        note: p.note,
                                                                        _id: p._id,
                                                                    });
                                                                    setPaymentModalOpen(true);
                                                                }}
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>

                                                            <button
                                                                className="p-2 bg-white border rounded"
                                                                onClick={() => deletePayment(p._id)}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                </div>

                            </div>
                        </div>

                        {/* status buttons */}
                        <div className="flex gap-3 mt-4 flex-wrap">
                            {["processing", "ready_for_delivery", "delivered", "completed"].map((s) => (
                                <button key={s} onClick={() => updateStatus(s)} className={`px-4 py-2 rounded-xl ${order.status === s ? "bg-[#0e9a86] text-white" : "bg-white border"}`}>
                                    {s.replace(/_/g, " ")}
                                </button>
                            ))}
                        </div>

                        {/* modals */}
                        {expenseModalOpen && (
                            <Modal close={() => setExpenseModalOpen(false)}>
                                <form onSubmit={addOrEditExpense} className="space-y-3">
                                    <h3 className="font-bold text-lg">{expenseForm._id ? "Edit Expense" : "Add Expense"}</h3>
                                    <select className="w-full border px-3 py-2 rounded" value={expenseForm.type} onChange={(e) => setExpenseForm({ ...expenseForm, type: e.target.value })}>
                                        <option value="labour">Labour</option>
                                        <option value="transport">Transport</option>
                                        <option value="misc">Misc</option>
                                        <option value="other">Other</option>
                                    </select>
                                    <input className="w-full border px-3 py-2 rounded" placeholder="Label" value={expenseForm.label} onChange={(e) => setExpenseForm({ ...expenseForm, label: e.target.value })} />
                                    <input className="w-full border px-3 py-2 rounded" type="number" placeholder="Amount" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
                                    <input className="w-full border px-3 py-2 rounded" placeholder="Note" value={expenseForm.note} onChange={(e) => setExpenseForm({ ...expenseForm, note: e.target.value })} />
                                    <div className="flex gap-2">
                                        <button type="submit" className="flex-1 bg-[#0e9a86] text-white py-2 rounded">{expenseForm._id ? "Save" : "Add"}</button>
                                        <button type="button" className="flex-1 bg-white border rounded" onClick={() => setExpenseModalOpen(false)}>Cancel</button>
                                    </div>
                                </form>
                            </Modal>
                        )}

                        {paymentModalOpen && (
                            <Modal close={() => setPaymentModalOpen(false)}>
                                <form onSubmit={addOrEditPayment} className="space-y-3">
                                    <h3 className="font-bold text-lg">{paymentForm._id ? "Edit Payment" : "Add Payment"}</h3>
                                    <select className="w-full border px-3 py-2 rounded" value={paymentForm.type} onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value })}>
                                        <option value="advance">Advance</option>
                                        <option value="payment">Payment</option>
                                    </select>
                                    <input className="w-full border px-3 py-2 rounded" type="number" placeholder="Amount" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
                                    <input className="w-full border px-3 py-2 rounded" placeholder="Note" value={paymentForm.note} onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })} />
                                    <div className="flex gap-2">
                                        <button type="submit" className="flex-1 bg-[#0e9a86] text-white py-2 rounded">{paymentForm._id ? "Save" : "Add"}</button>
                                        <button type="button" className="flex-1 bg-white border rounded" onClick={() => setPaymentModalOpen(false)}>Cancel</button>
                                    </div>
                                </form>
                            </Modal>
                        )}

                        {editMaterialModal && (
                            <Modal close={() => setEditMaterialModal(null)}>
                                <form onSubmit={submitEditMaterial} className="space-y-3">
                                    <h3 className="font-bold text-lg">Edit Material</h3>
                                    <div className="text-sm">Material: <strong>{editMaterialModal.materialId?.name || editMaterialModal.name}</strong></div>
                                    <input type="number" className="w-full border px-3 py-2 rounded" value={editMaterialForm.quantity} onChange={(e) => setEditMaterialForm({ ...editMaterialForm, quantity: e.target.value })} required />
                                    <input className="w-full border px-3 py-2 rounded" placeholder="Note" value={editMaterialForm.note} onChange={(e) => setEditMaterialForm({ ...editMaterialForm, note: e.target.value })} />
                                    <div className="flex gap-2">
                                        <button type="submit" className="flex-1 bg-[#0e9a86] text-white py-2 rounded">Save</button>
                                        <button type="button" className="flex-1 bg-white border rounded" onClick={() => setEditMaterialModal(null)}>Cancel</button>
                                    </div>
                                </form>
                            </Modal>
                        )}

                        {drawingModal && (
                            <Modal close={() => setDrawingModal(null)}>
                                <img src={drawingModal} alt="drawing" className="w-full h-[80vh] object-contain bg-white rounded" />
                            </Modal>
                        )}
                    </>
                )
            }
        </div >
    );
}

/* ---------- SUB-COMPONENTS ---------- */
const Modal = ({ children, close }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={close}>
        <div className="bg-white p-6 rounded-xl w-96 max-w-[92%] shadow-xl" onClick={(e) => e.stopPropagation()}>
            {children}
        </div>
    </div>
);
