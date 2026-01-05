import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

import KPICard from "../components/analytics/KPICard";
import ProfitModal from "../components/analytics/ProfitModal";
import ProductProfitModal from "../components/analytics/ProductProfitModal";

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
    const navigate = useNavigate();

    const [summary, setSummary] = useState({});
    const [orderProfitOpen, setOrderProfitOpen] = useState(false);
    const [productProfitOpen, setProductProfitOpen] = useState(false);

    useEffect(() => {
        api.get("/analytics/summary").then((res) => {
            setSummary(res.data?.data || {});
        });
    }, []);

    return (
        <div className="p-6 space-y-12 bg-gray-50 min-h-screen">

            {/* ================= ORDERS ANALYTICS ================= */}
            <div>
                <h2 className="text-xl font-bold mb-4 text-gray-700">
                    🧾 Orders Analytics
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                    <KPICard
                        title="Orders Revenue"
                        value={`₹${summary.ordersRevenue || 0}`}
                        sub={`Orders: ${summary.totalOrders || 0}`}
                        icon={<ShoppingBag />}
                        color="from-cyan-400 to-[#00BFA6]"
                    />

                    <KPICard
                        title="Total Orders"
                        value={summary.totalOrders || 0}
                        icon={<Layers />}
                        color="from-indigo-400 to-indigo-600"
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

                    {/* ✅ ORDER DUES CLICK */}
                    <KPICard
                        title="Outstanding Amount"
                        value={`₹${summary.dueAmount || 0}`}
                        icon={<Clock />}
                        color="from-yellow-400 to-amber-500"
                        clickable
                        onClick={() => navigate("/invoices/due?type=order")}
                    />


                    <KPICard
                        title="Net Profit"
                        value={`₹${summary.orderProfit || 0}`}
                        icon={<TrendingUp />}
                        color="from-[#00BFA6] to-emerald-700"
                        clickable
                        onClick={() => setOrderProfitOpen(true)}
                    />
                </div>
            </div>

            {/* ================= PRODUCTS ANALYTICS ================= */}
            <div>
                <h2 className="text-xl font-bold mb-4 text-gray-700">
                    📦 Products Analytics
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                    <KPICard
                        title="Products Revenue"
                        value={`₹${summary.productsRevenue || 0}`}
                        icon={<ShoppingBag />}
                        color="from-purple-400 to-fuchsia-600"
                    />

                    <KPICard
                        title="Products Sold"
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
                        title="Amount Received"
                        value={`₹${summary.productPaidAmount || 0}`}
                        icon={<Wallet />}
                        color="from-emerald-400 to-green-600"
                    />

                    {/* ✅ PRODUCT DUES CLICK */}
                    <KPICard
                        title="Outstanding Amount"
                        value={`₹${summary.productDueAmount || 0}`}
                        icon={<Clock />}
                        color="from-yellow-400 to-amber-500"
                        clickable
                        onClick={() => navigate("/invoices/due?type=product")}
                    />


                    <KPICard
                        title="Net Profit"
                        value={`₹${summary.productProfit || 0}`}
                        icon={<TrendingUp />}
                        color="from-[#7C3AED] to-fuchsia-700"
                        clickable
                        onClick={() => setProductProfitOpen(true)}
                    />
                </div>
            </div>

            {/* ================= CHARTS ================= */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MonthlyRevenueChart />
                <StockAgeingChart />
            </div>

            {/* ================= MODALS ================= */}
            {orderProfitOpen && (
                <ProfitModal onClose={() => setOrderProfitOpen(false)} />
            )}

            {productProfitOpen && (
                <ProductProfitModal onClose={() => setProductProfitOpen(false)} />
            )}
        </div>
    );
}
