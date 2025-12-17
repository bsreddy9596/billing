import { useEffect, useState } from "react";
import api from "../api/api";
import {
    PlusCircle,
    Archive,
    FileText,
    ListChecks,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";
    const navigate = useNavigate();

    const [summary, setSummary] = useState({
        totalOrders: 0,
        confirmedOrders: 0,
        pendingOrders: 0,
    });

    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAll();
    }, []);

    const extractArray = (res) => {
        if (!res?.data) return [];
        if (Array.isArray(res.data.data)) return res.data.data;
        if (Array.isArray(res.data.orders)) return res.data.orders;
        return [];
    };

    const loadAll = async () => {
        setLoading(true);
        try {
            // ✅ ROLE BASED ROUTES
            const ordersUrl = isAdmin ? "/orders" : "/orders/my";
            const recentUrl = `${ordersUrl}?limit=6&sort=-createdAt`;

            const [recentRes, allRes] = await Promise.all([
                api.get(recentUrl),
                api.get(ordersUrl),
            ]);

            const recentOrdersData = extractArray(recentRes);
            const allOrders = extractArray(allRes);

            const confirmedOrders = allOrders.filter(
                (o) => ["confirmed", "approved", "completed"].includes(o.status)
            ).length;

            const pendingOrders = allOrders.filter(
                (o) => o.status === "pending"
            ).length;

            setRecentOrders(recentOrdersData);

            setSummary({
                totalOrders: allOrders.length,
                confirmedOrders,
                pendingOrders,
            });
        } catch (err) {
            console.error("Dashboard load error:", err);
            toast.error("Failed to load dashboard");
        } finally {
            setLoading(false);
        }
    };

    const quickNavigate = (path) => navigate(path);

    return (
        <div className="p-6 space-y-6">
            {/* HEADER */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold flex items-center gap-3">
                        🏠 Dashboard Overview
                    </h1>
                    <p className="text-sm text-gray-500">
                        Quick actions & latest info
                    </p>
                </div>

                {/* TOP BUTTONS */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => quickNavigate("/orders/create")}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-green-400 to-emerald-600 
                        text-white px-4 py-2 rounded-lg shadow hover:scale-[1.01]"
                    >
                        <PlusCircle size={18} /> Create Order
                    </button>

                    <button
                        onClick={() => quickNavigate("/materials")}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 
                        text-white px-4 py-2 rounded-lg shadow hover:scale-[1.01]"
                    >
                        <Archive size={18} /> Stock Entry
                    </button>

                    <button
                        onClick={() => quickNavigate("/billing/create")}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-blue-500 
                        text-white px-4 py-2 rounded-lg shadow hover:scale-[1.01]"
                    >
                        <FileText size={18} /> Create Invoice
                    </button>
                </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="Total Orders" value={summary.totalOrders} gradient="from-indigo-500 to-blue-500" />
                <StatCard label="Confirmed Orders" value={summary.confirmedOrders} gradient="from-emerald-400 to-green-600" />
                <StatCard label="Pending Orders" value={summary.pendingOrders} gradient="from-yellow-400 to-orange-500" />
            </div>

            {/* RECENT ORDERS */}
            <div className="bg-white rounded-2xl shadow p-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                    <ListChecks className="text-indigo-500" /> Recent Orders
                </h3>

                <div className="divide-y">
                    {recentOrders.length === 0 ? (
                        <div className="py-6 text-center text-gray-500 italic">
                            No recent orders
                        </div>
                    ) : (
                        recentOrders.map((o) => (
                            <div key={o._id} className="py-3 flex justify-between">
                                <div>
                                    <div className="font-medium">{o.customerName || "Walk-in"}</div>
                                    <div className="text-xs text-gray-500">#{o._id.slice(-6)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-semibold">₹{o.saleAmount || 0}</div>
                                    <div className="text-xs text-gray-500">
                                        {new Date(o.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, gradient }) {
    return (
        <div className={`p-4 rounded-2xl text-white shadow bg-gradient-to-br ${gradient}`}>
            <p className="text-sm opacity-90">{label}</p>
            <p className="text-2xl font-bold mt-2">{value}</p>
        </div>
    );
}
