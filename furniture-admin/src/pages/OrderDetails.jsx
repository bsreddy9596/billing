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
    X,
    PlusCircle,
    Receipt,
    MapPin,
    Map
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { Input, Label } from "../components/ui/Input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/Table";


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
            const rate = Number(
                m.price ??
                m.materialId?.price ??
                m.costPerUnit ??
                m.materialId?.costPerUnit ??
                0
            );

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


    const openInvoice = async () => {
        try {
            // 1️⃣ create / get invoice using orderId
            const res = await api.post(`/invoices/order/${order._id}`);
            const invoice = res.data.data;

            // 2️⃣ open preview using invoiceId
            navigate(`/invoice/order/${invoice._id}`);
        } catch (err) {
            toast.error("Invoice create / load failed");
        }
    };

    /* ---------- RENDER ---------- */
    if (loading) return <div className="p-10 text-center">Loading...</div>;
    if (!order) return <div className="p-10 text-center text-red-500">Order Not Found</div>;

    const showFull = ["confirmed", "processing", "ready_for_delivery", "delivered", "completed"].includes(order.status);

    return (
        <div className="p-6 bg-gradient-to-b from-white to-[#F7FFFC] min-h-screen space-y-6">
            <Toaster position="top-right" />

            {/* Header Actions */}
            <div className="flex items-center justify-between animate-fade-in-up">
                <Button variant="ghost" className="gap-2" onClick={() => navigate(-1)}>
                    <ArrowLeft size={18} /> Back
                </Button>
                <div className="flex items-center gap-3">
                    <button
                        onClick={openInvoice}
                        className="flex items-center gap-2.5 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl transition-all duration-300 shadow-md shadow-indigo-500/20 hover:shadow-lg hover:-translate-y-0.5 font-semibold tracking-wide"
                    >
                        <Receipt size={18} className="drop-shadow-sm" /> Generate Invoice
                    </button>
                </div>
            </div>

            {/* Main Header Card */}
            <Card className="bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 text-slate-800 overflow-hidden border border-indigo-100/50 shadow-md rounded-2xl animate-fade-in-up" style={{ animationDelay: "50ms" }}>
                <div className="p-6 md:p-8 flex flex-col md:flex-row md:justify-between gap-6 relative">
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-100/40 to-purple-100/40 opacity-50 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-blue-100/40 to-indigo-100/40 opacity-50 rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none blur-2xl"></div>

                    <div className="relative z-10 flex flex-col justify-center">
                        <div className="flex items-center gap-5 md:gap-6">
                            <div className="p-4 bg-white rounded-2xl text-indigo-600 shadow-sm border border-indigo-50/50 ring-1 ring-black/5">
                                <User size={36} strokeWidth={1.5} />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                                    {order.customerId?.name || order.customerName || "Walk-in Customer"}
                                </h1>
                                <div className="mt-2.5 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-5 text-slate-500 font-medium text-sm">
                                    <span className="flex items-center gap-2 bg-white/60 px-2.5 py-1 rounded-md border border-slate-200/60 backdrop-blur-sm"><Phone size={15} className="text-indigo-500" /> {order.customerId?.phone || order.customerPhone || "No contact"}</span>
                                    <span className="flex items-center gap-2 bg-white/60 px-2.5 py-1 rounded-md border border-slate-200/60 backdrop-blur-sm"><MapPin size={15} className="text-purple-500" /> Village: {order.customerId?.address || order.customerAddress || "N/A"}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 text-left md:text-right flex flex-col justify-center border-t border-indigo-50/60 md:border-none pt-5 md:pt-0 mt-3 md:mt-0">
                        <div className="text-indigo-500/80 text-xs font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5 md:justify-end">
                            <Map size={14} /> Full Address
                        </div>
                        <div className="font-semibold text-lg max-w-sm ml-0 md:ml-auto leading-snug text-slate-700">{order.customerId?.address || order.customerAddress || "Address not provided"}</div>
                        <div className="mt-4 text-slate-500 flex items-center md:justify-end gap-3 flex-wrap">
                            <span className="bg-white/80 px-3 py-1.5 rounded-lg border border-slate-200/60 shadow-sm font-mono tracking-wide text-xs font-semibold text-slate-600 flex items-center gap-1.5 backdrop-blur-sm">
                                <span className="text-indigo-400">#</span> {String(order._id).substring(String(order._id).length - 6).toUpperCase()}
                            </span>
                            <span className="bg-white/80 px-3 py-1.5 rounded-lg border border-slate-200/60 shadow-sm flex items-center gap-1.5 text-xs font-semibold text-slate-600 backdrop-blur-sm">
                                <Calendar size={14} className="text-purple-400" /> {fmtDate(order.createdAt)}
                            </span>
                        </div>
                    </div>
                </div>
            </Card>

            {/* pending minimal */}
            {!showFull && (
                <Card className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
                    <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                        <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                            <ImageIcon size={20} className="text-primary" /> Review Drawings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {order.drawings.length === 0 ? (
                            <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <ImageIcon size={36} className="mx-auto text-slate-400 mb-3 opacity-50" />
                                <p className="font-medium">No drawings uploaded for this order.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                {order.drawings.map((d, idx) => (
                                    <div
                                        key={d._id ?? d.drawingUrl ?? `drawing-${idx}`}
                                        className="group border border-slate-200 rounded-xl p-3 bg-white cursor-pointer hover:border-primary hover:shadow-lg transition-all duration-300"
                                        onClick={() => setDrawingModal(d.drawingUrl)}
                                    >
                                        <div className="relative w-full h-44 bg-slate-100/50 rounded-lg mb-3 overflow-hidden border border-slate-100">
                                            <img src={d.drawingUrl} alt={d.itemType} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                                        </div>
                                        <div className="font-bold text-slate-800 truncate px-1">{d.itemType || d.name || "Design Drawing"}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* full view */}
            {
                showFull && (
                    <>
                        {/* 3 cards */}
                        <div className="grid md:grid-cols-3 gap-6 animate-fade-in-up" style={{ animationDelay: "150ms" }}>
                            {/* Cost */}
                            <Card className="hover:shadow-lg transition-all duration-300">
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-primary/10 p-2.5 rounded-xl text-primary">
                                                <Layers size={20} />
                                            </div>
                                            <div>
                                                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Cost Breakdown</div>
                                                <div className="font-bold text-slate-800">Materials & Expenses</div>
                                            </div>
                                        </div>
                                        <Badge variant="default">{order.materialsUsed.length} items</Badge>
                                    </div>

                                    <div className="space-y-2.5 text-sm">
                                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                            <span className="text-slate-600">Material Cost</span>
                                            <span className="font-semibold text-slate-800">₹{totals.totalMaterials.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                            <span className="text-slate-600">Labour Cost</span>
                                            <span className="font-semibold text-slate-800">₹{(order.expenses || []).filter((e) => e.type === "labour").reduce((a, b) => a + Number(b.amount), 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                            <span className="text-slate-600">Other Expenses</span>
                                            <span className="font-semibold text-slate-800">₹{(order.expenses || []).filter((e) => e.type !== "labour").reduce((a, b) => a + Number(b.amount), 0).toLocaleString()}</span>
                                        </div>
                                        <div className="pt-1 flex justify-between items-center text-primary font-bold text-base">
                                            <span>Total Cost</span>
                                            <span>₹{(totals.totalMaterials + totals.totalExpenses).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Payments */}
                            <Card className="hover:shadow-lg transition-all duration-300">
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-600">
                                                <Wallet size={20} />
                                            </div>
                                            <div>
                                                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Payments</div>
                                                <div className="font-bold text-slate-800">Received & Advances</div>
                                            </div>
                                        </div>
                                        <Badge variant="success">{paymentsNewestFirst.length} entries</Badge>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                        <div className="text-center border-r border-slate-200">
                                            <div className="text-xs text-slate-500 mb-1">Advance</div>
                                            <div className="font-semibold text-emerald-600 text-sm">₹{(order.payments || []).filter((p) => p.type === "advance").reduce((a, b) => a + Number(b.amount), 0).toLocaleString()}</div>
                                        </div>
                                        <div className="text-center border-r border-slate-200">
                                            <div className="text-xs text-slate-500 mb-1">Payments</div>
                                            <div className="font-semibold text-slate-700 text-sm">₹{(order.payments || []).filter((p) => p.type === "payment").reduce((a, b) => a + Number(b.amount), 0).toLocaleString()}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xs text-slate-500 mb-1">Due</div>
                                            <div className="font-bold text-rose-500 text-sm">₹{totals.due.toLocaleString()}</div>
                                        </div>
                                    </div>

                                    <div className="max-h-32 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                        {paymentsNewestFirst.map((p, index) => (
                                            <div key={p._id ?? p.createdAt ?? `payment-${index}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors text-sm">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={13} className="text-slate-400" />
                                                    <span className="text-slate-600">{resolveDate(p)}</span>
                                                    <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 ml-1">{p.type === "advance" ? "Adv" : "Pay"}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-slate-800">₹{Number(p.amount).toLocaleString()}</span>
                                                    {p.receiptId && (
                                                        <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" onClick={() => navigate(`/receipts/preview/${p.receiptId}`)}>
                                                            <Receipt size={12} />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {paymentsNewestFirst.length === 0 && <div className="text-slate-400 text-sm text-center italic py-2">No payments yet.</div>}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Sale & Profit */}
                            <Card className="hover:shadow-lg transition-all duration-300">
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-sky-100 p-2.5 rounded-xl text-sky-600">
                                                <Layers size={20} />
                                            </div>
                                            <div>
                                                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Financials</div>
                                                <div className="font-bold text-slate-800">Revenue Summary</div>
                                            </div>
                                        </div>
                                        <Badge variant={
                                            order.status === 'completed' ? 'success' :
                                                order.status === 'delivered' ? 'success' :
                                                    ['pending', 'processing'].includes(order.status) ? 'warning' : 'primary'
                                        }>
                                            {order.status.replace(/_/g, " ")}
                                        </Badge>
                                    </div>

                                    <div className="space-y-3 mt-6">
                                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <span className="text-slate-600 font-medium">Sale Amount</span>
                                            <span className="font-bold text-emerald-600 text-lg">₹{totals.sale.toLocaleString()}</span>
                                        </div>

                                        <div className={`flex justify-between items-center p-3 rounded-lg border ${totals.profit >= 0 ? "bg-emerald-50/50 border-emerald-100" : "bg-rose-50/50 border-rose-100"}`}>
                                            <span className="font-medium text-slate-700">Net Profit/Loss</span>
                                            <span className={`font-bold text-xl tracking-tight ${totals.profit >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                                                {totals.profit >= 0 ? "+" : "-"}₹{Math.abs(totals.profit).toLocaleString()}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center px-1 text-xs text-slate-500 mt-2">
                                            <span>Total Paid: <strong className="text-slate-700">₹{totals.paid.toLocaleString()}</strong></span>
                                            <span>Total Cost: <strong className="text-slate-700">₹{(totals.totalMaterials + totals.totalExpenses).toLocaleString()}</strong></span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* drawings full view */}
                        <Card className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
                            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                                <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                                    <ImageIcon size={20} className="text-primary" /> Design Drawings
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                {order.drawings.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        <ImageIcon size={36} className="mx-auto text-slate-400 mb-3 opacity-50" />
                                        <p className="font-medium">No drawings uploaded for this order.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                        {(order.drawings || []).map((d, idx) => (
                                            <div
                                                key={d._id ?? d.drawingUrl ?? `drawing-full-${idx}`}
                                                className="group border border-slate-200 rounded-xl p-3 bg-white cursor-pointer hover:border-primary hover:shadow-lg transition-all duration-300"
                                                onClick={() => d.drawingUrl && setDrawingModal(d.drawingUrl)}
                                            >
                                                <div className="relative w-full h-48 bg-slate-100/50 rounded-lg mb-3 overflow-hidden border border-slate-100 flex items-center justify-center">
                                                    {d.drawingUrl ? (
                                                        <img
                                                            src={d.drawingUrl}
                                                            alt={d.itemType}
                                                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                                                        />
                                                    ) : (
                                                        <div className="text-slate-400 font-medium">No Image</div>
                                                    )}
                                                </div>
                                                <div className="font-bold text-slate-800 truncate px-1 text-center">{d.itemType || d.name || "Design Drawing"}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>


                        {/* materials table */}
                        <Card className="animate-fade-in-up" style={{ animationDelay: "250ms" }}>
                            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50">
                                <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                                    <Tag className="text-primary" /> Materials Used
                                </CardTitle>
                                {(role === "employee" || role === "admin") && (
                                    <Button variant={showAddMaterialForm ? "ghost" : "primary"} onClick={() => setShowAddMaterialForm((s) => !s)} className="gap-2">
                                        {showAddMaterialForm ? <><X size={16} /> Close</> : <><PlusCircle size={16} /> Add Material</>}
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent className={showAddMaterialForm ? "p-0" : "pt-6"}>
                                {showAddMaterialForm && (role === "employee" || role === "admin") && (
                                    <form onSubmit={handleAddMaterial} className="p-6 bg-slate-50 border-b border-slate-200">
                                        <div className="grid md:grid-cols-4 gap-4">
                                            <div className="space-y-1">
                                                <Label>Material</Label>
                                                <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" required value={addMaterialForm.materialId} onChange={(e) => setAddMaterialForm({ ...addMaterialForm, materialId: e.target.value })}>
                                                    <option value="">Select material</option>
                                                    {materialList.map((m) => (
                                                        <option key={m._id} value={m._id}>
                                                            {m.name} — ₹{m.costPerUnit} (Avail: {m.availableQty})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label>Quantity</Label>
                                                <Input type="number" required placeholder="Qty" value={addMaterialForm.quantity} onChange={(e) => setAddMaterialForm({ ...addMaterialForm, quantity: e.target.value })} />
                                            </div>
                                            <div className="space-y-1">
                                                <Label>Note (Optional)</Label>
                                                <Input type="text" placeholder="Note" value={addMaterialForm.note} onChange={(e) => setAddMaterialForm({ ...addMaterialForm, note: e.target.value })} />
                                            </div>
                                            <div className="flex items-end">
                                                <Button type="submit" variant="primary" className="w-full">Add Material</Button>
                                            </div>
                                        </div>
                                    </form>
                                )}

                                <div className={showAddMaterialForm ? "p-6" : ""}>
                                    {order.materialsUsed.length === 0 ? (
                                        <div className="text-center py-8 text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                            No materials used yet.
                                        </div>
                                    ) : (
                                        <div className="border rounded-xl overflow-hidden">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-slate-50">
                                                        <TableHead>Material</TableHead>
                                                        <TableHead className="text-center">Qty</TableHead>
                                                        <TableHead className="text-center">Rate</TableHead>
                                                        <TableHead className="text-center">Total</TableHead>
                                                        <TableHead>Note</TableHead>
                                                        <TableHead className="text-right">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {(order.materialsUsed || []).map((m, i) => {
                                                        const rate = Number(m.costPerUnit ?? m.materialId?.costPerUnit ?? 0);
                                                        const total = rate * Number(m.quantity || 0);
                                                        return (
                                                            <TableRow key={m._id ?? `mat-${i}`}>
                                                                <TableCell className="font-medium">{m.materialId?.name || m.name}</TableCell>
                                                                <TableCell className="text-center">{m.quantity}</TableCell>
                                                                <TableCell className="text-center">₹{rate}</TableCell>
                                                                <TableCell className="text-center font-bold text-emerald-600">₹{total}</TableCell>
                                                                <TableCell className="text-slate-500 max-w-[200px] truncate" title={m.note}>{m.note || "-"}</TableCell>
                                                                <TableCell className="text-right">
                                                                    {(role === "employee" || role === "admin") && (
                                                                        <div className="flex gap-2 justify-end">
                                                                            <Button variant="ghost" size="sm" onClick={() => openEditMaterial(m)} className="h-8 w-8 p-0 text-slate-500 hover:text-primary">
                                                                                <Edit2 size={15} />
                                                                            </Button>
                                                                            <Button variant="ghost" size="sm" onClick={() => deleteMaterial(m)} className="h-8 w-8 p-0 text-slate-500 hover:text-rose-500">
                                                                                <Trash2 size={15} />
                                                                            </Button>
                                                                        </div>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* bottom lists: expenses & payments */}
                        <div className="grid md:grid-cols-2 gap-6 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
                            <Card className="hover:shadow-lg transition-all duration-300">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-lg text-slate-800">Expenses</CardTitle>
                                    {role === "admin" && (
                                        <Button variant="danger" size="sm" className="gap-2 bg-rose-50 text-rose-600 hover:bg-rose-100 border-none shadow-none" onClick={() => setExpenseModalOpen(true)}>
                                            <PlusCircle size={15} /> Add Expense
                                        </Button>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    {expensesNewestFirst.length === 0 ? (
                                        <div className="text-slate-400 italic text-center py-6 text-sm bg-slate-50/50 rounded-xl border border-dashed border-slate-200">No expenses recorded.</div>
                                    ) : (
                                        <div className="space-y-3 mt-2">
                                            {expensesNewestFirst.map((e, idx) => (
                                                <div key={e._id ?? `exp-${idx}`} className="border border-slate-100 bg-slate-50/50 p-3.5 rounded-xl flex justify-between items-center hover:border-slate-200 hover:bg-white transition-colors">
                                                    <div>
                                                        <div className="font-semibold text-slate-800">{e.label || (e.type.charAt(0).toUpperCase() + e.type.slice(1))}</div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="text-xs text-slate-500 flex items-center gap-1"><Calendar size={12} /> {resolveDate(e)}</div>
                                                            {e.note && <div className="text-xs text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[150px]" title={e.note}>{e.note}</div>}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-3 items-center">
                                                        <div className="font-bold text-slate-800">₹{Number(e.amount).toLocaleString()}</div>
                                                        {role === "admin" && (
                                                            <div className="flex gap-1 border-l border-slate-200 pl-3 ml-1">
                                                                <Button variant="ghost" size="sm" onClick={() => { setExpenseForm({ type: e.type, label: e.label, amount: e.amount, note: e.note, _id: e._id }); setExpenseModalOpen(true); }} className="h-8 w-8 p-0 text-slate-500 hover:text-primary">
                                                                    <Edit2 size={14} />
                                                                </Button>
                                                                <Button variant="ghost" size="sm" onClick={() => deleteExpense(e._id)} className="h-8 w-8 p-0 text-slate-500 hover:text-rose-500">
                                                                    <Trash2 size={14} />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="hover:shadow-lg transition-all duration-300">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-lg text-slate-800">Payments Log</CardTitle>
                                    {role === "admin" && (
                                        <Button variant="primary" size="sm" className="gap-2" onClick={() => setPaymentModalOpen(true)}>
                                            <PlusCircle size={15} /> Add Payment
                                        </Button>
                                    )}
                                </CardHeader>
                                <CardContent className="pr-1">
                                    {paymentsNewestFirst.length === 0 ? (
                                        <div className="text-slate-400 italic text-center py-6 text-sm bg-slate-50/50 rounded-xl mr-5 border border-dashed border-slate-200">No payments recorded.</div>
                                    ) : (
                                        <div className="space-y-3 mt-2 max-h-[300px] overflow-y-auto pr-3 custom-scrollbar">
                                            {paymentsNewestFirst.map((p, idx) => (
                                                <div key={p._id ?? `pay-full-${idx}`} className="border border-slate-100 bg-slate-50/50 p-3.5 rounded-xl flex justify-between items-center hover:border-slate-200 hover:bg-white transition-colors">
                                                    <div>
                                                        <div className="font-semibold text-slate-800 flex items-center gap-2">
                                                            {p.type === "advance" ? "Advance" : "Payment"}
                                                            {p.type === "advance" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="text-xs text-slate-500 flex items-center gap-1"><Calendar size={12} /> {resolveDate(p)}</div>
                                                            {p.note && <div className="text-xs text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[120px]" title={p.note}>{p.note}</div>}
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-3 items-center">
                                                        <div className="font-bold text-slate-800">₹{Number(p.amount).toLocaleString()}</div>

                                                        <div className="flex gap-1 border-l border-slate-200 pl-3 ml-1">
                                                            {p.receiptId && (
                                                                <Button variant="outline" size="sm" onClick={() => navigate(`/receipts/preview/${p.receiptId}`)} className="h-8 px-2 text-xs">
                                                                    Receipt
                                                                </Button>
                                                            )}
                                                            {role === "admin" && (
                                                                <>
                                                                    <Button variant="ghost" size="sm" onClick={() => { setPaymentForm({ type: p.type, amount: p.amount, note: p.note, _id: p._id }); setPaymentModalOpen(true); }} className="h-8 w-8 p-0 text-slate-500 hover:text-primary">
                                                                        <Edit2 size={14} />
                                                                    </Button>
                                                                    <Button variant="ghost" size="sm" onClick={() => deletePayment(p._id)} className="h-8 w-8 p-0 text-slate-500 hover:text-rose-500">
                                                                        <Trash2 size={14} />
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* status buttons */}
                        <div className="sticky bottom-4 z-40 bg-white/95 sm:bg-slate-50/95 backdrop-blur-md border border-slate-200 p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.1)] sm:shadow-sm animate-fade-in-up">
                            <div>
                                <h3 className="font-bold text-slate-800">Update Order Status</h3>
                                <p className="text-sm text-slate-500">Select the current progress stage of this order.</p>
                            </div>
                            <div className="flex gap-2.5 flex-wrap md:justify-end">
                                {["processing", "ready_for_delivery", "delivered", "completed"].map((s) => (
                                    <Button
                                        key={s}
                                        variant={order.status === s ? "primary" : "outline"}
                                        className={`capitalize ${order.status !== s ? "bg-white hover:bg-slate-100" : ""}`}
                                        onClick={() => updateStatus(s)}
                                    >
                                        {s.replace(/_/g, " ")}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* modals */}
                        {expenseModalOpen && (
                            <Modal close={() => setExpenseModalOpen(false)}>
                                <form onSubmit={addOrEditExpense} className="space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold text-xl text-slate-800">{expenseForm._id ? "Edit Expense" : "Add Expense"}</h3>
                                        <button type="button" onClick={() => setExpenseModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <Label>Expense Type</Label>
                                            <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" value={expenseForm.type} onChange={(e) => setExpenseForm({ ...expenseForm, type: e.target.value })}>
                                                <option value="labour">Labour</option>
                                                <option value="transport">Transport</option>
                                                <option value="misc">Misc</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>Label</Label>
                                            <Input placeholder="E.g. Painter wages" value={expenseForm.label} onChange={(e) => setExpenseForm({ ...expenseForm, label: e.target.value })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>Amount</Label>
                                            <Input type="number" required placeholder="₹0.00" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>Note (Optional)</Label>
                                            <Input placeholder="Additional details..." value={expenseForm.note} onChange={(e) => setExpenseForm({ ...expenseForm, note: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                                        <Button type="button" variant="outline" className="flex-1" onClick={() => setExpenseModalOpen(false)}>Cancel</Button>
                                        <Button type="submit" variant="primary" className="flex-1">{expenseForm._id ? "Save Changes" : "Save Expense"}</Button>
                                    </div>
                                </form>
                            </Modal>
                        )}

                        {paymentModalOpen && (
                            <Modal close={() => setPaymentModalOpen(false)}>
                                <form onSubmit={addOrEditPayment} className="space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold text-xl text-slate-800">{paymentForm._id ? "Edit Payment" : "Add Payment"}</h3>
                                        <button type="button" onClick={() => setPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <Label>Payment Type</Label>
                                            <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" value={paymentForm.type} onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value })}>
                                                <option value="advance">Advance</option>
                                                <option value="payment">Payment</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>Amount</Label>
                                            <Input type="number" required placeholder="₹0.00" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>Reference / Note</Label>
                                            <Input placeholder="NEFT Ref / Details..." value={paymentForm.note} onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                                        <Button type="button" variant="outline" className="flex-1" onClick={() => setPaymentModalOpen(false)}>Cancel</Button>
                                        <Button type="submit" variant="primary" className="flex-1">{paymentForm._id ? "Save Changes" : "Save Payment"}</Button>
                                    </div>
                                </form>
                            </Modal>
                        )}

                        {editMaterialModal && (
                            <Modal close={() => setEditMaterialModal(null)}>
                                <form onSubmit={submitEditMaterial} className="space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold text-xl text-slate-800">Edit Material Usage</h3>
                                        <button type="button" onClick={() => setEditMaterialModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
                                        <div className="text-sm text-slate-500 mb-1">Material Name</div>
                                        <div className="font-semibold text-slate-800">{editMaterialModal.materialId?.name || editMaterialModal.name}</div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <Label>Quantity</Label>
                                            <Input type="number" required value={editMaterialForm.quantity} onChange={(e) => setEditMaterialForm({ ...editMaterialForm, quantity: e.target.value })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>Note (Optional)</Label>
                                            <Input placeholder="Usage details..." value={editMaterialForm.note} onChange={(e) => setEditMaterialForm({ ...editMaterialForm, note: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                                        <Button type="button" variant="outline" className="flex-1" onClick={() => setEditMaterialModal(null)}>Cancel</Button>
                                        <Button type="submit" variant="primary" className="flex-1">Save Changes</Button>
                                    </div>
                                </form>
                            </Modal>
                        )}

                        {drawingModal && (
                            <Modal close={() => setDrawingModal(null)}>
                                <div className="relative">
                                    <button
                                        className="absolute top-2 right-2 bg-white/80 backdrop-blur p-2 rounded-full text-slate-800 hover:bg-white shadow-sm z-10 transition-colors"
                                        onClick={() => setDrawingModal(null)}
                                    >
                                        <X size={20} />
                                    </button>
                                    <img src={drawingModal} alt="drawing" className="w-full h-[80vh] object-contain bg-slate-50 rounded-lg p-2" />
                                </div>
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={close}>
        <div className="bg-white p-7 rounded-2xl w-full max-w-md shadow-2xl transform transition-all animate-scale-in" onClick={(e) => e.stopPropagation()}>
            {children}
        </div>
    </div>
);
