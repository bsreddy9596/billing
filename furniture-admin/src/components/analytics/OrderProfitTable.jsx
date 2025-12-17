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
            <div className="py-6 text-center text-gray-500">
                Loading order-wise profit...
            </div>
        );
    }

    if (!orders.length) {
        return (
            <div className="py-6 text-center text-gray-400">
                No order profit data found
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="p-2 text-left">Customer</th>
                        <th className="p-2 text-right">Order Value</th>
                        <th className="p-2 text-right">Material Cost</th>
                        <th className="p-2 text-right">Expenses</th>
                        <th className="p-2 text-right">Profit</th>
                    </tr>
                </thead>

                <tbody>
                    {orders.map((o, i) => (
                        <tr key={i} className="border-t">
                            <td className="p-2 font-medium">
                                {o.customerName || "General"}
                            </td>
                            <td className="p-2 text-right">₹{o.orderValue}</td>
                            <td className="p-2 text-right">₹{o.materialCost}</td>
                            <td className="p-2 text-right">₹{o.expenses}</td>
                            <td
                                className={`p-2 text-right font-bold ${o.profit >= 0 ? "text-green-600" : "text-red-600"
                                    }`}
                            >
                                ₹{o.profit}
                            </td>
                        </tr>
                    ))}
                </tbody>


            </table>
        </div>
    );
}
