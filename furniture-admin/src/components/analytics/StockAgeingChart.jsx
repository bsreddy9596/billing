import { useEffect, useState } from "react";
import api from "../../api/api";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";

export default function StockAgeingChart() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBucket, setSelectedBucket] = useState(null);
    const [products, setProducts] = useState([]);
    const [tableLoading, setTableLoading] = useState(false);

    useEffect(() => {
        const fetchAgeing = async () => {
            try {
                const res = await api.get("/analytics/products/ageing");
                const formatted = (res.data.data || []).map((d) => ({
                    bucket: d._id,
                    qty: d.totalQty,
                }));
                setData(formatted);
            } finally {
                setLoading(false);
            }
        };

        fetchAgeing();
    }, []);

    const handleBarClick = async (bucket) => {
        setSelectedBucket(bucket);
        setTableLoading(true);

        try {
            let url = "/analytics/products/dead-stock";

            if (bucket !== "90+ days") {
                url += `?bucket=${encodeURIComponent(bucket)}`;
            }

            const res = await api.get(url);
            setProducts(res.data.data || []);
        } finally {
            setTableLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow p-5 text-center">
                Loading stock ageing...
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow p-5">
            <h3 className="font-semibold text-lg mb-4">
                📦 Product Stock Ageing (Qty-wise)
            </h3>

            <ResponsiveContainer width="100%" height={300}>
                <BarChart
                    data={data}
                    onClick={(e) =>
                        e?.activeLabel && handleBarClick(e.activeLabel)
                    }
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bucket" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="qty" fill="#3b82f6" />
                </BarChart>
            </ResponsiveContainer>

            {selectedBucket && (
                <div className="mt-6">
                    <h4 className="font-semibold mb-3 text-red-600">
                        🚨 Stuck Products – {selectedBucket}
                    </h4>

                    {tableLoading ? (
                        <div className="text-center text-gray-500">
                            Loading products...
                        </div>
                    ) : products.length === 0 ? (
                        <div className="text-gray-500">
                            No products found
                        </div>
                    ) : (
                        <table className="w-full text-sm border">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-2 text-left">Product</th>
                                    <th className="p-2 text-right">Qty</th>
                                    <th className="p-2 text-right">Days</th>
                                    <th className="p-2 text-right">Value ₹</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((p) => (
                                    <tr key={p._id} className="border-t">
                                        <td className="p-2">{p.name}</td>
                                        <td className="p-2 text-right">
                                            {p.stockQty}
                                        </td>
                                        <td className="p-2 text-right text-red-600">
                                            {p.ageingDays}
                                        </td>
                                        <td className="p-2 text-right">
                                            ₹{p.stockValue}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}
