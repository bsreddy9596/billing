import { useEffect, useState } from "react";
import api from "../../api/api";
import { X, TrendingUp, Package } from "lucide-react";

export default function ProductProfitModal({ onClose }) {
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState([]);
    const [summary, setSummary] = useState({});

    useEffect(() => {
        api.get("/analytics/product-profit").then((res) => {
            const data = res.data.data || [];
            setProducts(data.products || []);
            setSummary(data.summary || {});
            setLoading(false);
        });
    }, []);

    const topProduct = products[0];

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden">

                {/* ================= HEADER ================= */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-purple-500 to-fuchsia-600 p-2 rounded-lg">
                            <TrendingUp className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Product Profit Analysis</h2>
                            <p className="text-sm text-gray-500">
                                Product-wise sales & profit
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100"
                    >
                        <X />
                    </button>
                </div>

                {/* ================= BODY ================= */}
                <div className="p-6 space-y-6">

                    {/* ===== TOP SELLING PRODUCT ===== */}
                    {topProduct && (
                        <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 border rounded-xl p-4 flex items-center justify-between">
                            <div>
                                <div className="text-sm text-gray-500">
                                    🔥 Top Selling Product
                                </div>
                                <div className="text-xl font-bold">
                                    {topProduct.name}
                                </div>
                                <div className="text-sm text-gray-600">
                                    Sold: {topProduct.quantity} units
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-sm text-gray-500">
                                    Profit
                                </div>
                                <div className="text-2xl font-bold text-green-600">
                                    ₹{topProduct.profit}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ===== SUMMARY ===== */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <SummaryBox label="Total Revenue" value={summary.revenue} />
                        <SummaryBox label="Total Cost" value={summary.cost} />
                        <SummaryBox label="Total Profit" value={summary.profit} highlight />
                        <SummaryBox label="Products Sold" value={summary.quantity} />
                    </div>

                    {/* ===== TABLE ===== */}
                    <div className="border rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 text-gray-600">
                                <tr>
                                    <th className="px-4 py-3 text-left">Product</th>
                                    <th className="px-4 py-3 text-right">Qty Sold</th>
                                    <th className="px-4 py-3 text-right">Revenue</th>
                                    <th className="px-4 py-3 text-right">Cost</th>
                                    <th className="px-4 py-3 text-right">Profit</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="text-center py-6">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : products.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center py-6">
                                            No product data found
                                        </td>
                                    </tr>
                                ) : (
                                    products.map((p, i) => (
                                        <tr
                                            key={i}
                                            className="border-t hover:bg-gray-50"
                                        >
                                            <td className="px-4 py-3 flex items-center gap-2">
                                                <Package size={16} className="text-gray-400" />
                                                {p.name}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {p.quantity}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                ₹{p.revenue}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                ₹{p.cost}
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-green-600">
                                                ₹{p.profit}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ================= FOOTER ================= */}
                <div className="px-6 py-4 border-t flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ================= SMALL COMPONENT ================= */

function SummaryBox({ label, value = 0, highlight }) {
    return (
        <div
            className={`rounded-xl p-4 border ${highlight ? "bg-green-50 border-green-200" : "bg-white"
                }`}
        >
            <div className="text-sm text-gray-500">{label}</div>
            <div
                className={`text-lg font-bold ${highlight ? "text-green-600" : ""
                    }`}
            >
                ₹{value}
            </div>
        </div>
    );
}
