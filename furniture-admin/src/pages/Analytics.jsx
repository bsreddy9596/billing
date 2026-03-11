import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

import ProfitModal from "../components/analytics/ProfitModal";
import ProductProfitModal from "../components/analytics/ProductProfitModal";

import MonthlyRevenueChart from "../components/analytics/MonthlyRevenueChart";
import StockAgeingChart from "../components/analytics/StockAgeingChart";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../components/ui/Card";
import {
    ShoppingBag,
    Package,
    Wallet,
    Clock,
    TrendingUp,
    TrendingDown,
    LineChart,
    Layers,
    Boxes,
    ChevronRight,
    IndianRupee,
    Banknote,
    FileCheck,
    PieChart,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    AlertCircle
} from "lucide-react";

export default function AnalyticsDashboard() {
    const navigate = useNavigate();

    const [summary, setSummary] = useState({});
    const [orderProfitOpen, setOrderProfitOpen] = useState(false);
    const [productProfitOpen, setProductProfitOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/analytics/summary").then((res) => {
            setSummary(res.data?.data || {});
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const money = (val) => `₹${(val || 0).toLocaleString("en-IN")}`;

    // Aggregates
    const totalRevenue = (summary.ordersRevenue || 0) + (summary.productsRevenue || 0);
    const totalReceived = (summary.paidAmount || 0) + (summary.productPaidAmount || 0);
    const totalDue = (summary.dueAmount || 0) + (summary.productDueAmount || 0);
    const totalProfit = (summary.orderProfit || 0) + (summary.productProfit || 0);

    const receivedPercentage = totalRevenue > 0 ? ((totalReceived / totalRevenue) * 100).toFixed(1) : 0;
    const duePercentage = totalRevenue > 0 ? ((totalDue / totalRevenue) * 100).toFixed(1) : 0;

    const KPICard = ({ title, value, subtitle, icon, colorClass, bgClass, trend, trendValue, onClick }) => (
        <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group" onClick={onClick}>
            <div className={`absolute top-0 right-0 w-32 h-32 transform translate-x-12 -translate-y-12 rounded-full opacity-10 ${bgClass} group-hover:scale-110 transition-transform duration-500`}></div>
            <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-sm font-semibold text-slate-500 tracking-wider uppercase">{title}</p>
                        <h3 className="text-3xl font-bold text-slate-800 mt-1 drop-shadow-sm">{value}</h3>
                    </div>
                    <div className={`p-3 rounded-xl ${bgClass} text-white shadow-sm`}>
                        {icon}
                    </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 font-medium">{subtitle}</span>
                    {trend && (
                        <div className={`flex items-center gap-1 font-semibold ${trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            {trendValue}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    const ReportRow = ({ label, value, valueClass = "text-slate-800", icon, hideBorder }) => (
        <div className={`flex items-center justify-between py-3 ${hideBorder ? '' : 'border-b border-slate-100'}`}>
            <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                {icon && <span className="text-slate-400">{icon}</span>}
                {label}
            </div>
            <div className={`text-sm font-bold ${valueClass}`}>
                {value}
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-4 text-slate-500">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
                    <span className="font-medium animate-pulse">Loading Financial Analytics...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-8 max-w-[1600px] mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <Activity className="w-7 h-7 text-primary" />
                        Business & Financial Overview
                    </h1>
                    <p className="text-sm text-slate-500 mt-1 font-medium">Real-time accounting, inventory, and billing insights.</p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                    <div className="flex flex-col text-right">
                        <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Reporting Period</span>
                        <span className="font-bold text-slate-700">All Time Summary</span>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                        <LineChart className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Top Level KPIs - SaaS Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <KPICard 
                    title="Total Revenue" 
                    value={money(totalRevenue)} 
                    subtitle="Gross generated income"
                    icon={<IndianRupee className="w-6 h-6" />}
                    bgClass="bg-blue-500"
                    trend="up"
                    trendValue="Auto"
                />
                <KPICard 
                    title="Amount Received" 
                    value={money(totalReceived)} 
                    subtitle="Cash/Bank receipts"
                    icon={<Wallet className="w-6 h-6" />}
                    bgClass="bg-emerald-500"
                    trend="up"
                    trendValue={`${receivedPercentage}% collected`}
                />
                <KPICard 
                    title="Outstanding Dues" 
                    value={money(totalDue)} 
                    subtitle="Pending collections"
                    icon={<Clock className="w-6 h-6" />}
                    bgClass="bg-rose-500"
                    trend="down"
                    trendValue={`${duePercentage}% pending`}
                    onClick={() => navigate("/invoices/due")}
                />
                <KPICard 
                    title="Net Profit" 
                    value={money(totalProfit)} 
                    subtitle="Estimated business profit"
                    icon={<TrendingUp className="w-6 h-6" />}
                    bgClass="bg-purple-500"
                    trend="up"
                    trendValue="Estimated"
                    onClick={() => setOrderProfitOpen(true)}
                />
            </div>

            {/* Structured Reports - Tally Style */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Orders Accounting Report */}
                <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow lg:col-span-1">
                    <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-5">
                        <CardTitle className="flex items-center justify-between text-base">
                            <span className="flex items-center gap-2 text-slate-800">
                                <FileCheck className="w-5 h-5 text-blue-500" />
                                Orders Accounting
                            </span>
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-md">{summary.totalOrders || 0} Orders</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5">
                        <ReportRow label="Gross Orders Revenue" value={money(summary.ordersRevenue)} valueClass="text-blue-600" />
                        <ReportRow label="Direct Material Cost" value={money(summary.materialStockValue)} valueClass="text-orange-500" />
                        <div className="my-2 border-l-2 border-slate-200 pl-4 space-y-1">
                            <ReportRow label="Payments Received" value={money(summary.paidAmount)} valueClass="text-emerald-600" hideBorder />
                            <ReportRow label="Pending Dues" value={money(summary.dueAmount)} valueClass="text-rose-500" hideBorder />
                        </div>
                        <ReportRow label="Allocated Orders Profit" value={money(summary.orderProfit)} valueClass="text-purple-600 text-lg" hideBorder />
                        
                        <div className="w-full bg-slate-100 h-2 mt-4 rounded-full overflow-hidden flex">
                            <div className="bg-emerald-500 h-full" style={{ width: `${summary.ordersRevenue ? ((summary.paidAmount||0) / summary.ordersRevenue) * 100 : 0}%` }} title="Received"></div>
                            <div className="bg-rose-500 h-full" style={{ width: `${summary.ordersRevenue ? ((summary.dueAmount||0) / summary.ordersRevenue) * 100 : 0}%` }} title="Due"></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-medium uppercase tracking-wider">
                            <span>Collection Progress</span>
                            <span>{summary.ordersRevenue ? (((summary.paidAmount||0) / summary.ordersRevenue) * 100).toFixed(0) : 0}% Completed</span>
                        </div>
                    </CardContent>
                    <CardFooter className="p-4 border-t border-slate-100 bg-slate-50">
                        <button onClick={() => setOrderProfitOpen(true)} className="w-full text-center text-sm font-semibold text-primary hover:text-primary-700 flex items-center justify-center gap-2">
                            View Deep Profit Analysis <ChevronRight className="w-4 h-4" />
                        </button>
                    </CardFooter>
                </Card>

                {/* Inventory Accounting Report */}
                <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow lg:col-span-1">
                    <CardHeader className="bg-slate-50/80 border-b border-slate-100 p-5">
                        <CardTitle className="flex items-center justify-between text-base">
                            <span className="flex items-center gap-2 text-slate-800">
                                <Package className="w-5 h-5 text-indigo-500" />
                                Inventory Sales Accounting
                            </span>
                            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-md">{summary.salesQty || 0} Units Sold</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5">
                        <ReportRow label="Inventory Sales Revenue" value={money(summary.productsRevenue)} valueClass="text-indigo-600" />
                        <ReportRow label="Current Stock Value" value={money(summary.productStockValue)} valueClass="text-slate-800" />
                        <div className="my-2 border-l-2 border-slate-200 pl-4 space-y-1">
                            <ReportRow label="Payments Received" value={money(summary.productPaidAmount)} valueClass="text-emerald-600" hideBorder />
                            <ReportRow label="Pending Dues" value={money(summary.productDueAmount)} valueClass="text-rose-500" hideBorder />
                        </div>
                        <ReportRow label="Allocated Sales Profit" value={money(summary.productProfit)} valueClass="text-purple-600 text-lg" hideBorder />
                        
                        <div className="w-full bg-slate-100 h-2 mt-4 rounded-full overflow-hidden flex">
                            <div className="bg-emerald-500 h-full" style={{ width: `${summary.productsRevenue ? ((summary.productPaidAmount||0) / summary.productsRevenue) * 100 : 0}%` }} title="Received"></div>
                            <div className="bg-rose-500 h-full" style={{ width: `${summary.productsRevenue ? ((summary.productDueAmount||0) / summary.productsRevenue) * 100 : 0}%` }} title="Due"></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-medium uppercase tracking-wider">
                            <span>Collection Progress</span>
                            <span>{summary.productsRevenue ? (((summary.productPaidAmount||0) / summary.productsRevenue) * 100).toFixed(0) : 0}% Completed</span>
                        </div>
                    </CardContent>
                    <CardFooter className="p-4 border-t border-slate-100 bg-slate-50">
                        <button onClick={() => setProductProfitOpen(true)} className="w-full text-center text-sm font-semibold text-primary hover:text-primary-700 flex items-center justify-center gap-2">
                            View Deep Profit Analysis <ChevronRight className="w-4 h-4" />
                        </button>
                    </CardFooter>
                </Card>

                {/* Consolidated Financial Summary (Tally Like) */}
                <Card className="border-2 border-slate-200 shadow-md bg-gradient-to-br from-white to-slate-50/50 lg:col-span-1">
                    <CardHeader className="p-5 pb-3">
                        <CardTitle className="flex items-center justify-between text-base">
                            <span className="flex items-center gap-2 text-slate-800">
                                <Banknote className="w-5 h-5 text-emerald-600" />
                                Financial Summary
                            </span>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tally Core</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 pt-2">
                        <div className="bg-slate-800 text-white rounded-xl p-5 shadow-inner mb-5">
                            <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-1">Company Net Balance</p>
                            <h2 className="text-3xl font-bold tracking-tight">{money(totalRevenue - totalDue)}</h2>
                            <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1 font-medium">
                                <ArrowUpRight className="w-3 h-3" /> Realized Cash
                            </p>
                        </div>

                        <div className="space-y-4 font-mono text-sm leading-tight">
                            <div className="flex justify-between items-center text-slate-600">
                                <span>Total Revenue Acct.</span>
                                <span className="font-semibold text-slate-800">{money(totalRevenue)}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-600">
                                <span>(-) Cost of Goods Soft</span>
                                <span className="font-semibold text-orange-600">{money(summary.materialStockValue)}</span>
                            </div>
                            <div className="border-t border-dashed border-slate-300 pt-2 flex justify-between items-center text-slate-800 font-bold">
                                <span>Gross Margin</span>
                                <span>{money(totalProfit)}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-600">
                                <span>Accounts Receivable</span>
                                <span className="font-semibold text-rose-600">{money(totalDue)}</span>
                            </div>
                            <div className="border-t-2 border-slate-800 pt-3 flex justify-between items-center text-emerald-600 font-bold text-lg">
                                <span>Net Realized P/L</span>
                                <span>{money(totalProfit - totalDue)}</span>
                            </div>
                        </div>

                        {totalDue > 0 && (
                            <div className="mt-5 p-3 rounded-lg bg-rose-50 border border-rose-100 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-rose-700 font-medium leading-snug">
                                    You have <strong className="font-bold">{money(totalDue)}</strong> locked in accounts receivable. Immediate collection is recommended to boost liquidity.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ================= CHARTS ================= */}
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mt-8 mb-4 px-2">
                <PieChart className="w-5 h-5 text-slate-500" />
                Trends & Analytics
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="shadow-sm border-slate-200">
                    <MonthlyRevenueChart />
                </div>
                <div className="shadow-sm border-slate-200">
                    <StockAgeingChart />
                </div>
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
