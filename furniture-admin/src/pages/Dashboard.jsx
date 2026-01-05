import { useEffect, useState } from "react";
import api from "../api/api";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Legend,
} from "recharts";

import {
    ShoppingBag,
    Clock,
    CheckCircle,
    RefreshCcw,
    Truck,
} from "lucide-react";

export default function Dashboard() {
    const [summary, setSummary] = useState({
        totalOrders: 0,
        pendingOrders: 0,
        confirmedOrders: 0,
        processingOrders: 0,
        readyForDeliveryOrders: 0,
    });

    const [monthly, setMonthly] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const [summaryRes, monthlyRes] = await Promise.all([
                    api.get("/analytics/summary"),
                    api.get("/analytics/monthly"),
                ]);

                setSummary(summaryRes.data?.data || {});
                setMonthly(monthlyRes.data?.data || []);
            } catch (err) {
                console.error("❌ Dashboard Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();
    }, []);

    if (loading) {
        return (
            <div className="p-6 text-gray-500 text-center animate-pulse">
                ⏳ Loading dashboard...
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-2">
                🏠 Dashboard Overview
            </h1>

            {/* ================= ORDER STATUS CARDS ================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <StatCard
                    icon={<ShoppingBag size={26} />}
                    label="Total Orders"
                    value={summary.totalOrders}
                    gradient="from-[#00BFA6] to-[#009E8E]"
                />

                <StatCard
                    icon={<Clock size={26} />}
                    label="Pending Orders"
                    value={summary.pendingOrders}
                    gradient="from-yellow-400 to-orange-500"
                />

                <StatCard
                    icon={<CheckCircle size={26} />}
                    label="Confirmed Orders"
                    value={summary.confirmedOrders}
                    gradient="from-emerald-400 to-green-600"
                />

                <StatCard
                    icon={<RefreshCcw size={26} />}
                    label="Processing Orders"
                    value={summary.processingOrders}
                    gradient="from-sky-400 to-blue-500"
                />

                <StatCard
                    icon={<Truck size={26} />}
                    label="Ready for Delivery"
                    value={summary.readyForDeliveryOrders}
                    gradient="from-purple-400 to-fuchsia-600"
                />
            </div>

            {/* ================= MONTHLY ORDERS CHART ================= */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    📊 Monthly Orders
                </h2>

                {monthly.length === 0 ? (
                    <div className="text-center text-gray-400 py-10">
                        No data available
                    </div>
                ) : (
                    <div className="flex justify-center items-center w-full h-[320px]">
                        <ResponsiveContainer width="95%" height="100%">
                            <BarChart
                                data={monthly}
                                margin={{ top: 20, right: 30, left: 0, bottom: 10 }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#e5e7eb"
                                />
                                <XAxis dataKey="month" stroke="#6b7280" />
                                <YAxis stroke="#6b7280" allowDecimals={false} />
                                <Tooltip />
                                <Legend />
                                <Bar
                                    dataKey="totalOrders"
                                    name="Orders"
                                    fill="#00BFA6"
                                    radius={[6, 6, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ================= STAT CARD ================= */
function StatCard({ icon, label, value, gradient }) {
    return (
        <div
            className={`bg-gradient-to-br ${gradient} text-white p-5 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300`}
        >
            <div className="flex justify-between items-center">
                <div>
                    <p className="text-sm opacity-90">{label}</p>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                </div>
                <div className="bg-white bg-opacity-20 p-2 rounded-full">
                    {icon}
                </div>
            </div>
        </div>
    );
}
