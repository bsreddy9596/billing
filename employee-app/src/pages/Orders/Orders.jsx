import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";

import {
    Eye,
    CheckCircle,
    XCircle,
    Pencil,
    Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

export default function Orders() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [orders, setOrders] = useState([]);
    const [filter, setFilter] = useState("all");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            const res = await api.get("/orders/my");
            setOrders(res.data.data || []);
        } catch {
            toast.error("Failed to load orders");
        } finally {
            setLoading(false);
        }
    };

    /* -------------------------------------------------------------- */
    /* FIXED confirm route → /orders/confirm/:id                      */
    /* -------------------------------------------------------------- */
    const confirmOrder = async (id) => {
        try {
            await api.put(`/orders/confirm/${id}`);
            toast.success("Order Confirmed");
            loadOrders();
        } catch {
            toast.error("Failed to confirm");
        }
    };

    /* -------------------------------------------------------------- */
    /* FIXED reject route → /orders/reject/:id                        */
    /* -------------------------------------------------------------- */
    const rejectOrder = async (id) => {
        try {
            await api.put(`/orders/reject/${id}`);
            toast.success("Order Rejected");
            loadOrders();
        } catch {
            toast.error("Failed to reject");
        }
    };

    const deleteOrder = async (id) => {
        if (!window.confirm("Delete order permanently?")) return;
        try {
            await api.delete(`/orders/${id}`);
            toast.success("Order Deleted");
            loadOrders();
        } catch {
            toast.error("Delete failed");
        }
    };

    /* ---------------- FILTER LOGIC ---------------- */
    const getFilteredOrders = () => {
        if (filter === "pending") return orders.filter((o) => o.status === "pending");
        if (filter === "rejected") return orders.filter((o) => o.status === "rejected");

        if (filter === "confirmed")
            return orders.filter((o) =>
                ["processing", "ready_for_delivery", "completed"].includes(o.status)
            );

        return orders; // ALL
    };

    const filtered = getFilteredOrders();

    return (
        <div className="p-6 space-y-6">

            {/* HEADER */}
            <div className="bg-[#e9fff6] p-6 rounded-3xl shadow flex justify-between items-center">
                <h1 className="text-3xl font-bold text-emerald-800">
                    🧾 Orders Management
                </h1>

                <button
                    onClick={() => navigate("/orders/create")}
                    className="bg-emerald-600 text-white px-5 py-3 rounded-xl shadow hover:bg-emerald-700 flex items-center gap-2"
                >
                    ➕ Create Order
                </button>
            </div>

            {/* TABS */}
            <div className="flex gap-4">
                {["all", "pending", "confirmed", "rejected"].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setFilter(tab)}
                        className={`px-6 py-2 rounded-xl border font-semibold transition ${filter === tab
                            ? "bg-emerald-600 text-white border-emerald-700 shadow"
                            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
                            }`}
                    >
                        {tab.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* ORDERS TABLE */}
            <div className="bg-white rounded-2xl shadow-md border p-6">
                {loading && <p>Loading...</p>}

                {!loading && filtered.length === 0 && (
                    <p className="text-gray-500 text-center p-6">No orders found.</p>
                )}

                {!loading && filtered.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-emerald-50 text-emerald-700 text-left">
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Customer</th>
                                    <th className="p-4">Phone</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-center">Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filtered.map((o) => (
                                    <tr key={o._id} className="border-b hover:bg-gray-50">

                                        {/* DATE */}
                                        <td className="p-4">
                                            {new Date(o.createdAt).toLocaleDateString()}
                                        </td>

                                        {/* NAME */}
                                        <td className="p-4 font-medium text-gray-800">
                                            {o.customerName || "Walk-in"}
                                        </td>

                                        {/* PHONE */}
                                        <td className="p-4 text-gray-700">
                                            {o.customerPhone || "—"}
                                        </td>

                                        {/* STATUS */}
                                        <td className="p-4">
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-semibold
                                                    ${o.status === "pending"
                                                        ? "bg-yellow-100 text-yellow-700"
                                                        : o.status === "confirmed"
                                                            ? "bg-blue-100 text-blue-700"
                                                            : o.status === "rejected"
                                                                ? "bg-red-100 text-red-700"
                                                                : "bg-green-100 text-green-700"
                                                    }
                                                `}
                                            >
                                                {o.status}
                                            </span>
                                        </td>

                                        {/* ACTIONS */}
                                        <td className="p-4 text-center flex items-center justify-center gap-3">

                                            {/* Pending → edit/delete allowed for employee */}
                                            {user.role === "employee" && o.status === "pending" && (
                                                <>
                                                    <button
                                                        onClick={() => navigate(`/orders/create?edit=${o._id}`)}
                                                        className="text-blue-600 hover:text-blue-800"
                                                    >
                                                        <Pencil size={18} />
                                                    </button>

                                                    <button
                                                        onClick={() => deleteOrder(o._id)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </>
                                            )}

                                            {/* Admin approves or rejects pending */}
                                            {user.role === "admin" && o.status === "pending" && (
                                                <>
                                                    <button
                                                        onClick={() => confirmOrder(o._id)}
                                                        className="text-green-600 hover:text-green-800 flex items-center gap-1"
                                                    >
                                                        <CheckCircle size={18} /> Confirm
                                                    </button>

                                                    <button
                                                        onClick={() => rejectOrder(o._id)}
                                                        className="text-red-600 hover:text-red-800 flex items-center gap-1"
                                                    >
                                                        <XCircle size={18} /> Reject
                                                    </button>
                                                </>
                                            )}

                                            {/* View for ALL except rejected */}
                                            {o.status !== "rejected" && (
                                                <button
                                                    onClick={() => navigate(`/orders/${o._id}`)}
                                                    className="text-emerald-600 hover:text-emerald-900 flex items-center gap-1"
                                                >
                                                    <Eye size={18} /> View
                                                </button>
                                            )}

                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
