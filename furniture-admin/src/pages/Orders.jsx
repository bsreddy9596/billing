// src/pages/Orders.jsx
import React, { useEffect, useState } from "react";
import api from "../api/api";
import socket from "../socket";
import {
    Eye,
    CheckCircle,
    XCircle,
    Trash2,
    Search,
    Pencil,
    Plus,
    MoreVertical
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Input, Label } from "../components/ui/Input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/Table";
import Badge from "../components/ui/Badge";

export default function Orders() {
    const navigate = useNavigate();

    const [orders, setOrders] = useState([]);
    const [tab, setTab] = useState("all");
    const [search, setSearch] = useState("");
    const [toast, setToast] = useState(null);

    const [rejectModal, setRejectModal] = useState(null);
    const [rejectReason, setRejectReason] = useState("");

    const [amountModal, setAmountModal] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 2500);
    };

    /* ---------------- FILTER LOGIC ---------------- */
    const getStatusFilter = () => {
        if (tab === "pending") return ["pending"];
        if (tab === "rejected") return ["rejected"];
        if (tab === "confirmed")
            return ["confirmed", "processing", "ready_for_delivery", "completed"];
        return [];
    };

    /* ---------------- FETCH ORDERS ---------------- */
    const fetchOrders = async () => {
        try {
            const statuses = getStatusFilter();

            const q = new URLSearchParams({
                search,
                status: statuses.join(","),
            });

            const res = await api.get(`/orders?${q.toString()}`);
            setOrders(res.data?.data || []);
        } catch (err) {
            showToast("Failed to load orders", "error");
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [tab, search]);

    /* SOCKET LISTENERS */
    useEffect(() => {
        socket.on("order-updated", fetchOrders);
        socket.on("order-created", fetchOrders);
        socket.on("order-deleted", fetchOrders);

        return () => {
            socket.off("order-updated");
            socket.off("order-created");
            socket.off("order-deleted");
        };
    }, []);

    /* AUTO CLOSE CONTEXT MENU */
    useEffect(() => {
        const close = () => setContextMenu(null);
        window.addEventListener("click", close);
        return () => window.removeEventListener("click", close);
    }, []);

    /* ---------------- CONFIRM ---------------- */
    const submitAmount = async (amount) => {
        if (!amount) return alert("Enter valid amount");

        try {
            await api.put(`/orders/confirm/${amountModal}`, {
                saleAmount: Number(amount),
            });

            showToast("Order confirmed!");
            setAmountModal(null);
            fetchOrders();
        } catch {
            showToast("Confirm failed", "error");
        }
    };

    /* ---------------- REJECT ---------------- */
    const handleReject = async () => {
        try {
            await api.put(`/orders/reject/${rejectModal}`, {
                reason: rejectReason,
            });

            showToast("Order Rejected", "error");
            setRejectModal(null);
            setRejectReason("");
            fetchOrders();
        } catch {
            showToast("Reject failed", "error");
        }
    };

    /* ---------------- DELETE ORDER ---------------- */
    const handleDelete = async (id) => {
        if (!confirm("Delete permanently?")) return;

        try {
            await api.delete(`/orders/${id}`);
            showToast("Order deleted!", "warning");
        } catch (err) {
            showToast(err?.response?.data?.message || "Delete failed", "error");
        }

        // ✅ always close menu
        setContextMenu(null);

        // refresh always
        fetchOrders();
    };

    /* ---------------- CONTEXT MENU ---------------- */
    const showContextMenu = (e, order) => {
        e.preventDefault();
        e.stopPropagation();

        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            order,
        });
    };

    /* ---------------- TABLE ROW ---------------- */
    const renderRow = (o) => (
        <TableRow
            key={o._id}
            className="cursor-pointer group"
            onClick={() => navigate(`/orders/${o._id}`)}
            onContextMenu={(e) => showContextMenu(e, o)}
        >
            <TableCell className="text-slate-600 whitespace-nowrap">
                {new Date(o.createdAt).toLocaleDateString("en-IN", { month: "short", day: "2-digit", year: "numeric" })}
            </TableCell>
            <TableCell>
                <div className="font-medium text-slate-900">{o.customerName}</div>
                <div className="text-sm text-slate-500">{o.customerPhone}</div>
            </TableCell>

            <TableCell>
                <StatusBadge status={o.status} />
            </TableCell>

            {/* Confirmed Tab → Amount */}
            {tab === "confirmed" && (
                <TableCell className="text-right font-bold text-emerald-600">
                    ₹{(o.saleAmount || 0).toLocaleString()}
                </TableCell>
            )}

            {/* Rejected Tab → Reason */}
            {tab === "rejected" && (
                <TableCell className="text-rose-600 text-sm max-w-[200px] truncate" title={o.rejectionReason}>
                    {o.rejectionReason || "--"}
                </TableCell>
            )}

            <TableCell className="text-right whitespace-nowrap space-x-2 sticky right-0 bg-white group-hover:bg-slate-50/80 z-10 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.05)] border-l border-slate-100">

                {o.status === "pending" && (
                    <>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8 px-2"
                            onClick={(e) => {
                                e.stopPropagation();
                                setAmountModal(o._id);
                            }}
                        >
                            <CheckCircle size={16} className="mr-1" />
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 px-2"
                            onClick={(e) => {
                                e.stopPropagation();
                                setRejectModal(o._id);
                            }}
                        >
                            <XCircle size={16} className="mr-1" />
                        </Button>
                    </>
                )}

                <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary-600 hover:text-primary-700 hover:bg-primary-50 h-8 px-2"
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/orders/${o._id}`);
                    }}
                >
                    <Eye size={16} className="mr-1" />
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 h-8 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => showContextMenu(e, o)}
                >
                    <MoreVertical size={16} />
                </Button>
            </TableCell>
        </TableRow>
    );

    return (
        <div className="space-y-6">

            {toast && (
                <div className={`fixed top-6 right-6 px-6 py-4 rounded-xl text-white shadow-2xl z-50 animate-in slide-in-from-top-4 flex items-center gap-3 ${toast.type === "error" ? "bg-rose-600" : toast.type === "warning" ? "bg-amber-600" : "bg-emerald-600"}`}>
                    <span className="font-medium">{toast.msg}</span>
                </div>
            )}

            {/* HEADER */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Orders</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage and track customer orders here.</p>
                </div>

                <Button onClick={() => navigate("/createorder")} icon={Plus}>
                    Create Order
                </Button>
            </div>

            {/* FILTERS & SEARCH */}
            <Card>
                <CardContent className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    {/* TABS */}
                    <div className="flex gap-2 bg-slate-100/80 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
                        <TabButton label="All" active={tab === "all"} onClick={() => setTab("all")} />
                        <TabButton label="Pending" active={tab === "pending"} onClick={() => setTab("pending")} />
                        <TabButton label="Confirmed" active={tab === "confirmed"} onClick={() => setTab("confirmed")} />
                        <TabButton label="Rejected" active={tab === "rejected"} onClick={() => setTab("rejected")} />
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search customer or phone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-slate-50 border-slate-200"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* TABLE */}
            <Card>
                <div className="overflow-x-auto">
                    <Table className="min-w-full text-sm">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Customer Info</TableHead>
                                <TableHead>Status</TableHead>

                                {tab === "confirmed" && <TableHead className="text-right">Amount</TableHead>}
                                {tab === "rejected" && <TableHead>Reason</TableHead>}

                                <TableHead className="text-right sticky right-0 bg-slate-50/90 backdrop-blur z-20 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.02)] border-l border-slate-100">Actions</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {orders.map(renderRow)}

                            {orders.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan="6" className="text-center py-12 text-slate-500">
                                        No orders found matching your criteria.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* CONTEXT MENU */}
            {contextMenu && (
                <div
                    className="fixed bg-white border shadow-xl rounded-lg p-2 z-50"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        className="px-4 py-2 w-full text-left hover:bg-gray-100 flex items-center gap-2"
                        onClick={() => {
                            navigate(`/createorder?edit=${contextMenu.order._id}`);
                            setContextMenu(null);
                        }}
                    >
                        <Pencil size={15} /> Edit
                    </button>

                    <button
                        className="px-4 py-2 w-full text-left hover:bg-gray-100 text-red-600 flex items-center gap-2"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(contextMenu.order._id);
                        }}
                    >
                        <Trash2 size={15} /> Delete
                    </button>
                </div>
            )}

            {/* MODALS */}
            <AmountModal open={!!amountModal} onClose={() => setAmountModal(null)} onSubmit={submitAmount} />

            {rejectModal && (
                <RejectModal
                    reason={rejectReason}
                    setReason={setRejectReason}
                    onSubmit={handleReject}
                    onClose={() => setRejectModal(null)}
                />
            )}
        </div>
    );
}

/* ---------------- Components ---------------- */
function TabButton({ label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                }`}
        >
            {label}
        </button>
    );
}

function StatusBadge({ status }) {
    const map = {
        pending: "warning",
        confirmed: "success",
        processing: "info",
        ready_for_delivery: "primary",
        completed: "default",
        rejected: "danger",
    };

    const labels = {
        ready_for_delivery: "Ready",
    }

    return (
        <Badge variant={map[status] || "default"}>
            {labels[status] || status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
    );
}

/* ---- Confirm Modal ---- */
function AmountModal({ open, onClose, onSubmit }) {
    const [amount, setAmount] = useState("");

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
            <Card className="w-full max-w-sm flex flex-col" onClick={(e) => e.stopPropagation()}>
                <CardHeader>
                    <CardTitle>Confirm Order</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Final Sale Amount (₹)</Label>
                        <Input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Enter final negotiated amount"
                            autoFocus
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button variant="secondary" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={() => onSubmit(amount)}>
                            Confirm Order
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

/* ---- Reject Modal ---- */
function RejectModal({ onClose, onSubmit, reason, setReason }) {
    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
            <Card className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                <CardHeader>
                    <CardTitle className="text-rose-600">Reject Order</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Reason for rejection</Label>
                        <textarea
                            className="flex min-h-[100px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Tell us why this order is being rejected..."
                            autoFocus
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button variant="secondary" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={onSubmit}>
                            Reject Order
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
