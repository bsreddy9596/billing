import { useEffect, useState } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";

import {
    PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
    AreaChart, Area, XAxis, YAxis, CartesianGrid
} from "recharts";

import {
    Plus, Activity, CreditCard, TrendingUp, ShoppingBag, MoreHorizontal, Package
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/Table";
import Badge from "../components/ui/Badge";

export default function Dashboard() {
    const navigate = useNavigate();

    const [summary, setSummary] = useState({});
    const [chartData, setChartData] = useState([]);
    const [chartFilter, setChartFilter] = useState("month");
    const [recentOrders, setRecentOrders] = useState([]);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchDashboard = async () => {
            try {
                const [sumRes, upcRes, actRes, chartRes] = await Promise.all([
                    api.get("/analytics/summary"),
                    api.get("/analytics/upcoming-deliveries"),
                    api.get("/activity?limit=30"),
                    api.get(`/analytics/orders-chart?filter=${chartFilter}`)
                ]);

                if (isMounted) {
                    setSummary(sumRes.data?.data || {});

                    let deliveries = upcRes.data?.data || [];
                    setRecentOrders(deliveries);
                    const allActs = actRes.data?.data || actRes.data?.activities || [];
                    const validActs = allActs.filter(a => {
                        const act = (a.action || "").toLowerCase();
                        const validOrders = ["order created", "order confirmed", "order rejected", "order delivered", "product sold"];
                        return validOrders.some(v => act.includes(v));
                    }).slice(0, 5);
                    setActivities(validActs);

                    const rawChart = chartRes.data?.data || [];
                    const safeChart = rawChart.map(d => ({
                        label: d.label || "",
                        orders: Number(d.orders) || 0,
                        revenue: Number(d.revenue) || 0
                    }));
                    if (safeChart.length === 0) {
                        safeChart.push({ label: 'No Data', orders: 0, revenue: 0 });
                    }
                    setChartData(safeChart);
                }
            } catch (err) {
                console.error("Dashboard Fetch Error", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchDashboard();

        return () => { isMounted = false; };
    }, [chartFilter]);

    if (loading && !Object.keys(summary).length) {
        return (
            <div className="flex items-center justify-center p-12 text-slate-500 animate-pulse">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    <span className="font-medium">Loading dashboard data...</span>
                </div>
            </div>
        );
    }

    const formatTimeAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) return `${minutes} Mins`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} Hrs`;
        const days = Math.floor(hours / 24);
        return `${days} Days`;
    };

    const getBadgeVariant = (status) => {
        const map = {
            pending: "warning",
            confirmed: "info",
            processing: "primary",
            ready_for_delivery: "success",
            delivered: "default",
            completed: "default",
            rejected: "danger",
        };
        return map[status] || "default";
    };

    // Derived values mapping
    const totalOrders = summary.totalOrders || 0;
    const ordersRevenue = summary.ordersRevenue || 0;
    const productRevenue = summary.productsRevenue || 0;
    const totalRevenue = ordersRevenue + productRevenue;
    const totalReceived = (summary.paidAmount || 0) + (summary.productPaidAmount || 0);
    const totalDue = (summary.dueAmount || 0) + (summary.productDueAmount || 0);
    const availableBalance = summary.availableBalance || 0;
    const materialCostValue = summary.ordersMaterialCost || summary.totalMaterialCost || summary.materialStockValue || 0;
    const productStockValue = summary.productStockValue || 0;
    const totalProductsSold = summary.salesQty || 0;
    const productPaidAmount = summary.productPaidAmount || 0;
    const productDueAmount = summary.productDueAmount || 0;

    return (
        <div className="space-y-6 pb-6">

            {/* Top Row: Analytics Chart & Donut Chart */}
            <div className="flex flex-col xl:flex-row gap-6">

                {/* Orders Analytics Area Chart */}
                <Card className="xl:flex-[2] border-none shadow-[0_0_20px_0_rgba(76,87,125,0.02)] flex flex-col">
                    <div className="p-4 md:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border-b border-slate-100/60 pb-3">
                        <div>
                            <h2 className="text-base font-bold text-slate-800 tracking-tight">Dashboard</h2>
                            <p className="text-[11px] text-slate-500 font-medium">Overview of Latest {chartFilter.charAt(0).toUpperCase() + chartFilter.slice(1)}</p>
                        </div>
                        <div className="flex gap-3">
                            {["day", "week", "month", "year"].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setChartFilter(f)}
                                    className={`text-[11px] font-bold uppercase transition-colors outline-none pb-0.5 border-b-2 ${chartFilter === f ? "text-[#f1416c] border-[#f1416c]" : "text-slate-400 border-transparent hover:text-[#f1416c]"
                                        }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                        <div className="hidden sm:flex items-center gap-4 text-[13px] font-bold mt-4 sm:mt-0">
                            <span className="flex items-center gap-1.5 text-slate-500"><div className="w-2 h-2 rounded-full bg-[#009ef7]"></div> Orders</span>
                            <span className="flex items-center gap-1.5 text-slate-500"><div className="w-2 h-2 rounded-full bg-[#f1416c]"></div> Revenue</span>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col md:flex-row">
                        {/* 2 left + 4 below layout mapping for 6 stats */}
                        <div className="w-full md:w-1/3 p-6 md:p-8 flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-100">
                            <div className="mb-6 md:mb-8">
                                <h3 className="text-[12px] md:text-[13px] text-slate-400 font-bold uppercase tracking-wider mb-1 md:mb-2">Total Revenue</h3>
                                <div className="text-xl lg:text-2xl xl:text-3xl font-bold text-slate-800 tracking-tight truncate">
                                    ₹{totalRevenue.toLocaleString()}
                                </div>
                            </div>
                            <div className="mb-6 md:mb-8">
                                <h3 className="text-[12px] md:text-[13px] text-slate-400 font-bold uppercase tracking-wider mb-1 md:mb-2">Orders Revenue</h3>
                                <div className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight truncate">
                                    ₹{ordersRevenue.toLocaleString()}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-[12px] md:text-[13px] text-slate-400 font-bold uppercase tracking-wider mb-1 md:mb-2">Products Revenue</h3>
                                <div className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight truncate">
                                    ₹{productRevenue.toLocaleString()}
                                </div>
                            </div>
                        </div>

                        {/* Chart Area */}
                        <div className="w-full md:w-2/3 h-[240px] md:h-[260px] p-2 flex flex-col justify-end relative">
                            <ResponsiveContainer width="100%" height="100%" minHeight={240}>
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorO" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#009ef7" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#009ef7" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorR" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f1416c" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#f1416c" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f4" />
                                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a5b7' }} dy={10} />
                                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={false} width={0} />
                                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={false} width={0} />
                                    <RechartsTooltip />
                                    <Area yAxisId="left" type="monotone" dataKey="orders" stroke="#009ef7" strokeWidth={3} fillOpacity={1} fill="url(#colorO)" />
                                    <Area yAxisId="right" type="monotone" dataKey="revenue" stroke="#f1416c" strokeWidth={3} fillOpacity={1} fill="url(#colorR)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Below Chart 4 Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 border-t border-slate-100 bg-slate-50/30">
                        <div className="p-3 border-r border-b md:border-b-0 border-slate-100 text-center flex flex-col items-center justify-center">
                            <div className="text-[10px] md:text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Total Received Amount</div>
                            <div className="text-sm md:text-base font-bold text-slate-800 truncate px-2">₹{totalReceived.toLocaleString()}</div>
                        </div>
                        <div className="p-3 border-b md:border-r md:border-b-0 border-slate-100 text-center flex flex-col items-center justify-center">
                            <div className="text-[10px] md:text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Total Due Amount</div>
                            <div className="text-sm md:text-base font-bold text-slate-800 truncate px-2">₹{totalDue.toLocaleString()}</div>
                        </div>
                        <div className="p-3 border-r border-slate-100 text-center flex flex-col items-center justify-center">
                            <div className="text-[10px] md:text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Products Stock Value</div>
                            <div className="text-sm md:text-base font-bold text-slate-800 truncate px-2">₹{productStockValue.toLocaleString()}</div>
                        </div>
                        <div className="p-3 text-center flex flex-col items-center justify-center">
                            <div className="text-[10px] md:text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Material Stock Value</div>
                            <div className="text-sm md:text-base font-bold text-slate-800 truncate px-2">₹{materialCostValue.toLocaleString()}</div>
                        </div>
                    </div>
                </Card>

                {/* Right Donut Chart */}
                <Card className="xl:flex-[1] border-none shadow-[0_0_20px_0_rgba(76,87,125,0.02)] flex flex-col">
                    <CardHeader className="pt-4 px-5 pb-2 border-none flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-bold text-slate-800">Order Status</CardTitle>
                        <div className="text-xs font-bold text-slate-500">Total Orders: {totalOrders}</div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col items-center justify-center p-4 relative">
                        <div className="w-full h-[220px] pt-2 pb-6">
                            <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: "Pending", value: summary.pendingOrders || 0, color: "#7239ea" },
                                            { name: "Confirmed", value: summary.confirmedOrders || 0, color: "#009ef7" },
                                            { name: "Ready for Delivery", value: summary.readyForDeliveryOrders || 0, color: "#ffc700" },
                                            { name: "Delivered", value: summary.deliveredOrders || 0, color: "#50cd89" }
                                        ].filter(d => d.value > 0)}
                                        cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none"
                                    >
                                        {[
                                            { name: "Pending", value: summary.pendingOrders || 0, color: "#7239ea" },
                                            { name: "Confirmed", value: summary.confirmedOrders || 0, color: "#009ef7" },
                                            { name: "Ready for Delivery", value: summary.readyForDeliveryOrders || 0, color: "#ffc700" },
                                            { name: "Delivered", value: summary.deliveredOrders || 0, color: "#50cd89" }
                                        ].filter(d => d.value > 0).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 gap-y-3 gap-x-2 w-full mt-2 px-2">
                            <div className="text-center">
                                <span className="flex items-center justify-center gap-1.5 text-slate-500 text-[10px] md:text-[11px] font-bold"><div className="w-2 h-2 rounded-full bg-[#7239ea]"></div> Pending</span>
                                <div className="text-base md:text-lg font-bold text-slate-800 mt-0.5">{summary.pendingOrders || 0}</div>
                            </div>
                            <div className="text-center">
                                <span className="flex items-center justify-center gap-1.5 text-slate-500 text-[10px] md:text-[11px] font-bold"><div className="w-2 h-2 rounded-full bg-[#009ef7]"></div> Confirmed</span>
                                <div className="text-base md:text-lg font-bold text-slate-800 mt-0.5">{summary.confirmedOrders || 0}</div>
                            </div>
                            <div className="text-center">
                                <span className="flex items-center justify-center gap-1.5 text-slate-500 text-[10px] md:text-[11px] font-bold"><div className="w-2 h-2 rounded-full bg-[#ffc700]"></div> Ready for Delivery</span>
                                <div className="text-base md:text-lg font-bold text-slate-800 mt-0.5">{summary.readyForDeliveryOrders || 0}</div>
                            </div>
                            <div className="text-center">
                                <span className="flex items-center justify-center gap-1.5 text-slate-500 text-[10px] md:text-[11px] font-bold"><div className="w-2 h-2 rounded-full bg-[#50cd89]"></div> Delivered</span>
                                <div className="text-base md:text-lg font-bold text-slate-800 mt-0.5">{summary.deliveredOrders || 0}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Middle Product Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <GradientStatCard
                    title="Total Products Sold"
                    value={`${totalProductsSold.toLocaleString()}`}
                    bgClass="from-[#f1416c] to-[#ff6b6b]"
                    onClick={() => navigate('/analytics')}
                />
                <GradientStatCard
                    title="Product Revenue"
                    value={`₹${productRevenue.toLocaleString()}`}
                    bgClass="from-[#7239ea] to-[#9b6dff]"
                    onClick={() => navigate('/analytics')}
                />
                <GradientStatCard
                    title="Product Received Amount"
                    value={`₹${productPaidAmount.toLocaleString()}`}
                    bgClass="from-[#009ef7] to-[#3dbdff]"
                    onClick={() => navigate('/analytics')}
                />
                <GradientStatCard
                    title="Product Due Amount"
                    value={`₹${productDueAmount.toLocaleString()}`}
                    bgClass="from-[#ffc700] to-[#ffd84d]"
                    onClick={() => navigate('/analytics')}
                />
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activities */}
                <Card className="lg:col-span-1 border-none shadow-[0_0_20px_0_rgba(76,87,125,0.02)] flex flex-col">
                    <CardHeader className="pt-5 px-6 pb-4 border-none flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-bold text-slate-800">Recent Activities</CardTitle>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 pt-2">
                        {activities.length === 0 ? (
                            <div className="text-slate-400 text-sm py-4">No recent order or product activities.</div>
                        ) : (
                            <div className="relative before:absolute before:inset-0 before:ml-[11px] md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-slate-100">
                                {activities.slice(0, 5).map((a, idx) => {
                                    const dotColors = ["border-[#009ef7]", "border-[#f1416c]", "border-[#50cd89]", "border-[#ffc700]", "border-[#7239ea]"];
                                    const dotColor = dotColors[idx % dotColors.length];

                                    return (
                                        <div key={a._id || idx} className="relative flex items-center mb-4 last:mb-0 group">
                                            <div className="hidden md:flex w-[60px] justify-end text-[10px] text-slate-500 font-semibold pr-4">
                                                {formatTimeAgo(a.createdAt)}
                                            </div>
                                            <div className={`absolute left-[11px] md:left-auto md:relative w-2.5 h-2.5 rounded-full bg-white border-[2px] ${dotColor} z-10 md:mx-[-5px] group-hover:scale-125 transition-transform`}></div>
                                            <div className="pl-8 md:pl-4 flex-1">
                                                <div className="text-[12px] font-bold text-slate-800 break-words line-clamp-1 leading-tight">
                                                    {a.action}
                                                </div>
                                                <div className="text-[11px] text-slate-500 mt-1 font-medium bg-slate-50 px-2 py-1 rounded inline-block border border-slate-100 line-clamp-2">
                                                    {a.message}
                                                </div>
                                                <div className="md:hidden text-[9px] text-slate-400 mt-1 font-semibold">
                                                    {formatTimeAgo(a.createdAt)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Delivery Schedule Table */}
                <Card className="lg:col-span-2 border-none shadow-[0_0_20px_0_rgba(76,87,125,0.02)] overflow-hidden flex flex-col">
                    <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-5 px-6 pb-4 border-none bg-white gap-4">
                        <div>
                            <CardTitle className="text-base font-bold text-slate-800 tracking-tight">Delivery Schedule</CardTitle>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Upcoming within 5 days</p>
                        </div>
                        <div className="relative w-full sm:w-auto">
                            <input type="text" placeholder="Search..." className="bg-slate-50 border border-slate-100 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#f1416c]/20 focus:border-[#f1416c] w-full sm:w-48" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto w-full">
                        <Table className="w-full min-w-[500px]">
                            <TableHeader>
                                <TableRow className="bg-[#1e1e2d] border-none">
                                    <TableHead className="text-white font-bold py-3 px-5 tracking-wide text-[11px] uppercase whitespace-nowrap">Customer</TableHead>
                                    <TableHead className="text-white font-bold py-3 px-5 tracking-wide text-[11px] uppercase whitespace-nowrap">Contact</TableHead>
                                    <TableHead className="text-white font-bold py-3 px-5 tracking-wide text-[11px] uppercase whitespace-nowrap">Location</TableHead>
                                    <TableHead className="text-white font-bold py-3 px-5 text-right tracking-wide text-[11px] uppercase whitespace-nowrap">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentOrders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="py-12 text-center text-slate-500 font-medium border-b border-slate-100">
                                            No upcoming deliveries in the set timeframe.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    recentOrders.map(o => {
                                        const now = new Date().setHours(0, 0, 0, 0);
                                        const expected = o.expectedDelivery ? new Date(o.expectedDelivery).setHours(0, 0, 0, 0) : now;

                                        // "Delivery Delayed" logic
                                        const isDelayed = expected < now && o.status !== 'delivered';

                                        return (
                                            <TableRow key={o._id} className="border-b border-slate-100/60 hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="py-2.5 px-4 text-left whitespace-nowrap">
                                                    <button onClick={() => navigate(`/orders/${o._id}`)} className="font-bold text-[12px] text-slate-800 hover:text-[#f1416c] transition-colors inline-block w-full text-left truncate max-w-[120px]">
                                                        {o.customerName || "General"}
                                                    </button>
                                                    {isDelayed && (
                                                        <div className="mt-0.5"><Badge variant="danger" className="text-[9px] px-1.5 py-0.5">Delayed</Badge></div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-2.5 px-4 text-[11px] font-semibold text-slate-500 truncate whitespace-nowrap">
                                                    {o.customerPhone || "-"}
                                                </TableCell>
                                                <TableCell className="py-2.5 px-4 whitespace-nowrap">
                                                    <div className="text-[11px] font-semibold text-slate-600 truncate max-w-[100px] md:max-w-[150px]">
                                                        {o.customerAddress ? o.customerAddress.split(',')[0] : "-"}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2.5 px-4 text-right whitespace-nowrap">
                                                    <Badge variant={getBadgeVariant(o.status)} className="px-2 py-0.5 text-[9px] uppercase tracking-wider font-bold">
                                                        {o.status.replace(/_/g, " ")}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function GradientStatCard({ title, value, bgClass, onClick }) {
    return (
        <Card onClick={onClick} className={`bg-gradient-to-r ${bgClass} text-white border-none shadow-[0_8px_24px_rgba(0,0,0,0.06)] overflow-hidden group transition-all hover:-translate-y-1 ${onClick ? 'cursor-pointer' : ''} flex flex-col justify-center min-h-[70px]`}>
            <CardContent className="p-4 relative flex items-center justify-between">
                <div className="absolute right-0 top-0 w-16 h-16 bg-white/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500"></div>
                <div className="w-full">
                    <h3 className="text-white/90 font-bold text-[10px] md:text-[11px] uppercase tracking-wider mb-1">{title}</h3>
                    <div className="text-lg md:text-xl font-bold tracking-tight truncate w-full">
                        {value}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
