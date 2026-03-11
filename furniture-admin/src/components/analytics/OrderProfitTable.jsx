// components/analytics/OrderProfitTable.jsx
import { useEffect, useState } from "react";
import api from "../../api/api"; // ✅ CORRECT PATH

export default function OrderProfitTable({ dateRange }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfit = async () => {
            try {
                // ✅ Do NOT send undefined dates
                let url = "/analytics/order-profit";

                if (dateRange?.from && dateRange?.to) {
                    url += `?from=${dateRange.from}&to=${dateRange.to}`;
                }

                const res = await api.get(url);
                console.log("📦 Order Profit:", res.data);

                setOrders(res.data?.data || []);
            } catch (err) {
                console.error("❌ Order profit fetch error", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfit();
    }, [dateRange]);

    if (loading) {
        return (
            <div className="py-10 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 flex-shrink-0 animate-spin border-4 border-slate-200 border-t-primary rounded-full"></div>
                <span className="text-sm font-medium text-slate-500 animate-pulse">Loading order profit analysis...</span>
            </div>
        );
    }

    if (!orders.length) {
        return (
            <div className="py-10 text-center bg-slate-50 border border-slate-100 border-dashed rounded-xl m-2">
                <span className="text-sm font-medium text-slate-500">No order profit data found for this period.</span>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Mobile View: Stacked Cards */}
            <div className="grid grid-cols-1 gap-4 md:hidden p-2">
                {orders.map((o, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-3 relative overflow-hidden">
                        <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-1">
                            <div className="flex flex-col gap-1 w-[70%]">
                                <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 w-max">#{o.orderId || "N/A"}</span>
                                <span className="font-semibold text-slate-800 text-sm leading-tight truncate">{o.customerName || "General Customer"}</span>
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-1 bg-primary/10 text-primary-700 rounded-md flex-shrink-0">Profit Data</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                            <div className="flex flex-col">
                                <span className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold">Order Value</span>
                                <span className="font-medium text-slate-800">₹{o.orderValue?.toLocaleString() || 0}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold">Material Cost</span>
                                <span className="font-medium text-orange-600">₹{o.materialCost?.toLocaleString() || 0}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold">Expenses</span>
                                <span className="font-medium text-rose-500">₹{o.expenses?.toLocaleString() || 0}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold">Net Profit</span>
                                <span className={`font-bold text-lg leading-none mt-1 ${o.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                    ₹{o.profit?.toLocaleString() || 0}
                                </span>
                            </div>
                        </div>
                        
                        {/* Status Indicator Bar */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${o.profit >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}></div>
                    </div>
                ))}
            </div>

            {/* Desktop View: Data Table */}
            <div className="hidden md:block w-full overflow-x-auto rounded-xl border border-slate-200 shadow-sm align-middle">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold tracking-wide uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4 whitespace-nowrap w-[15%]">Order ID</th>
                            <th className="px-6 py-4 whitespace-nowrap w-[35%]">Customer</th>
                            <th className="px-6 py-4 text-right whitespace-nowrap">Order Value</th>
                            <th className="px-6 py-4 text-right whitespace-nowrap">Material Cost</th>
                            <th className="px-6 py-4 text-right whitespace-nowrap">Expenses</th>
                            <th className="px-6 py-4 text-right whitespace-nowrap">Net Profit</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                        {orders.map((o, i) => (
                            <tr key={i} className="hover:bg-slate-50/80 transition-colors group">
                                <td className="px-6 py-4 whitespace-nowrap align-middle">
                                    <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">
                                        #{o.orderId || "N/A"}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-800 whitespace-nowrap align-middle">
                                    {o.customerName || "General Customer"}
                                </td>
                                <td className="px-6 py-4 text-right text-slate-600 font-medium whitespace-nowrap align-middle">
                                    ₹{o.orderValue?.toLocaleString() || 0}
                                </td>
                                <td className="px-6 py-4 text-right text-orange-600 font-medium whitespace-nowrap align-middle">
                                    ₹{o.materialCost?.toLocaleString() || 0}
                                </td>
                                <td className="px-6 py-4 text-right text-rose-500 font-medium whitespace-nowrap align-middle">
                                    ₹{o.expenses?.toLocaleString() || 0}
                                </td>
                                <td className={`px-6 py-4 text-right font-bold whitespace-nowrap align-middle ${o.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                    ₹{o.profit?.toLocaleString() || 0}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
