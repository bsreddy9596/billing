import { useEffect, useState } from "react";
import api from "../api/api";
import KPICard from "../components/analytics/KPICard";
import ProfitModal from "../components/analytics/ProfitModal";

import MonthlyRevenueChart from "../components/analytics/MonthlyRevenueChart";
import StockAgeingChart from "../components/analytics/StockAgeingChart";

import {
    ShoppingBag,
    Package,
    Wallet,
    Clock,
    TrendingUp,
    Layers,
    Boxes,
} from "lucide-react";

export default function AnalyticsDashboard() {
    const [summary, setSummary] = useState({});
    const [profitOpen, setProfitOpen] = useState(false);

    useEffect(() => {
        api.get("/analytics/summary").then((res) => {
            console.log("SUMMARY API:", res.data.data);
            setSummary(res.data.data || {});
        });
    }, []);
    return (
        <div className="p-6 space-y-8 bg-gray-50 min-h-screen">

            {/* ================= KPI CARDS ================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-6">

                <KPICard
                    title="Total Revenue"
                    value={`₹${summary.ordersRevenue || 0}`}
                    sub={`Orders: ${summary.totalOrders || 0}`}
                    icon={<ShoppingBag />}
                    color="from-cyan-400 to-[#00BFA6]"
                />

                <KPICard
                    title="Units Sold"
                    value={summary.salesQty || 0}
                    icon={<Layers />}
                    color="from-indigo-400 to-indigo-600"
                />

                <KPICard
                    title="Product Inventory"
                    value={`₹${summary.productStockValue || 0}`}
                    icon={<Package />}
                    color="from-purple-400 to-fuchsia-600"
                />

                <KPICard
                    title="Material Inventory"
                    value={`₹${summary.materialStockValue || 0}`}
                    icon={<Boxes />}
                    color="from-orange-400 to-orange-600"
                />

                <KPICard
                    title="Amount Received"
                    value={`₹${summary.paidAmount || 0}`}
                    icon={<Wallet />}
                    color="from-emerald-400 to-green-600"
                />

                <KPICard
                    title="Outstanding Amount"
                    value={`₹${summary.dueAmount || 0}`}
                    icon={<Clock />}
                    color="from-yellow-400 to-amber-500"
                />

                <KPICard
                    title="Net Profit"
                    value={`₹${summary.profit || 0}`}
                    icon={<TrendingUp />}
                    color="from-[#00BFA6] to-emerald-700"
                    clickable
                    onClick={() => setProfitOpen(true)}
                />
            </div>

            {/* ================= CHARTS ================= */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MonthlyRevenueChart />
                <StockAgeingChart />
            </div>

            {profitOpen && <ProfitModal onClose={() => setProfitOpen(false)} />}
        </div>
    );
}
