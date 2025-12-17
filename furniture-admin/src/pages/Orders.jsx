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
    Pencil
} from "lucide-react";
import { useNavigate } from "react-router-dom";

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
        <tr
            key={o._id}
            className="border-b hover:bg-[#E6FFF8] cursor-pointer"
            onClick={() => navigate(`/orders/${o._id}`)}
            onContextMenu={(e) => showContextMenu(e, o)}
        >
            <td className="p-3">{new Date(o.createdAt).toLocaleDateString("en-IN")}</td>
            <td className="p-3 font-medium">{o.customerName}</td>
            <td className="p-3">{o.customerPhone}</td>

            <td className="p-3">
                <StatusBadge status={o.status} />
            </td>

            {/* Confirmed Tab → Amount */}
            {tab === "confirmed" && (
                <td className="p-3 text-green-600 font-semibold">
                    ₹{(o.saleAmount || 0).toLocaleString()}
                </td>
            )}

            {/* Rejected Tab → Reason */}
            {tab === "rejected" && (
                <td className="p-3 text-red-600">{o.rejectionReason || "--"}</td>
            )}

            <td className="p-3 flex gap-2">

                {o.status === "pending" && (
                    <>
                        <ActionButton
                            icon={<CheckCircle size={15} />}
                            label="Confirm"
                            color="green"
                            onClick={(e) => {
                                e.stopPropagation();
                                setAmountModal(o._id);
                            }}
                        />

                        <ActionButton
                            icon={<XCircle size={15} />}
                            label="Reject"
                            color="red"
                            onClick={(e) => {
                                e.stopPropagation();
                                setRejectModal(o._id);
                            }}
                        />
                    </>
                )}

                <ActionButton
                    icon={<Eye size={15} />}
                    label="View"
                    color="mint"
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/orders/${o._id}`);
                    }}
                />
            </td>
        </tr>
    );

    return (
        <div className="p-6 space-y-6">

            {toast && (
                <div className="fixed top-6 right-6 px-5 py-3 rounded-xl text-white shadow-lg z-50">
                    {toast.msg}
                </div>
            )}

            {/* HEADER */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Orders</h1>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate("/createorder")}
                        className="px-4 py-2 rounded-lg bg-[#00BFA6] text-white font-semibold shadow hover:bg-[#009f8b]"
                    >
                        + Create Order
                    </button>

                    <div className="bg-white border rounded-xl px-4 py-1.5 shadow flex items-center w-80">
                        <Search size={18} className="text-gray-400 mr-2" />
                        <input
                            className="flex-1 bg-transparent outline-none"
                            placeholder="Search customer or phone..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* TABS */}
            <div className="flex gap-2 bg-white shadow p-2 rounded-xl w-fit">
                <TabButton label="All" active={tab === "all"} onClick={() => setTab("all")} />
                <TabButton label="Pending" active={tab === "pending"} onClick={() => setTab("pending")} />
                <TabButton label="Confirmed" active={tab === "confirmed"} onClick={() => setTab("confirmed")} />
                <TabButton label="Rejected" active={tab === "rejected"} onClick={() => setTab("rejected")} />
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-2xl shadow-lg border overflow-hidden">
                <table className="min-w-full text-sm">
                    <thead className="bg-[#E0FFF5]">
                        <tr>
                            <th className="p-3 text-left">Date</th>
                            <th className="p-3 text-left">Name</th>
                            <th className="p-3 text-left">Phone</th>
                            <th className="p-3 text-left">Status</th>

                            {tab === "confirmed" && <th className="p-3 text-left">Amount</th>}
                            {tab === "rejected" && <th className="p-3 text-left">Reason</th>}

                            <th className="p-3 text-left">Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {orders.map(renderRow)}

                        {orders.length === 0 && (
                            <tr>
                                <td colSpan="6" className="text-center py-6 text-gray-500 italic">
                                    No orders found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

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
            className={`px-4 py-1 rounded-lg text-sm font-semibold ${active ? "bg-[#00BFA6] text-white" : "text-gray-700"
                }`}
        >
            {label}
        </button>
    );
}

function StatusBadge({ status }) {
    const map = {
        pending: "bg-yellow-100 text-yellow-700",
        confirmed: "bg-green-100 text-green-700",
        processing: "bg-blue-100 text-blue-700",
        ready_for_delivery: "bg-purple-100 text-purple-700",
        completed: "bg-gray-100 text-gray-700",
        rejected: "bg-red-100 text-red-700",
    };

    return (
        <span className={`px-2 py-1 rounded-full text-xs ${map[status] || "bg-gray-100"}`}>
            {status}
        </span>
    );
}

function ActionButton({ icon, label, color, onClick }) {
    const style = {
        green: "text-green-600 hover:bg-green-100",
        red: "text-red-600 hover:bg-red-100",
        mint: "text-[#00BFA6] hover:bg-[#E0FFF5]",
        blue: "text-blue-600 hover:bg-blue-100",
    };

    return (
        <button
            onClick={onClick}
            className={`px-3 py-1 rounded-md text-sm flex items-center gap-1 ${style[color]}`}
        >
            {icon} {label}
        </button>
    );
}

/* ---- Confirm Modal ---- */
function AmountModal({ open, onClose, onSubmit }) {
    const [amount, setAmount] = useState("");

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50" onClick={onClose}>
            <div
                className="bg-white p-6 rounded-xl w-80"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="font-bold mb-3">Enter Amount</h2>

                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="border px-3 py-2 w-full rounded"
                />

                <div className="flex justify-end mt-3 gap-2">
                    <button onClick={onClose} className="px-3 py-1 bg-gray-200 rounded">
                        Cancel
                    </button>
                    <button
                        onClick={() => onSubmit(amount)}
                        className="px-3 py-1 bg-green-600 text-white rounded"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ---- Reject Modal ---- */
function RejectModal({ onClose, onSubmit, reason, setReason }) {
    return (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50" onClick={onClose}>
            <div
                className="bg-white p-6 rounded-xl w-80"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="font-bold mb-3">Reject Order</h2>

                <textarea
                    className="border rounded w-full px-3 py-2"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason..."
                />

                <div className="flex justify-end mt-3 gap-2">
                    <button onClick={onClose} className="px-3 py-1 bg-gray-200 rounded">
                        Cancel
                    </button>
                    <button
                        onClick={onSubmit}
                        className="px-3 py-1 bg-red-600 text-white rounded"
                    >
                        Reject
                    </button>
                </div>
            </div>
        </div>
    );
}
