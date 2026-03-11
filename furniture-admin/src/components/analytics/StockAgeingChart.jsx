import { useEffect, useState } from "react";
import api from "../../api/api";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../ui/Table";
import { Package } from "lucide-react";
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
            <Card className="flex items-center justify-center p-12 text-slate-500 animate-pulse">
                <CardContent className="p-0">Loading stock ageing...</CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-none border-none border-slate-200">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-slate-400" />
                    Product Stock Ageing (Qty-wise)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="w-full h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            onClick={(e) =>
                                e?.activeLabel && handleBarClick(e.activeLabel)
                            }
                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="bucket" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                            <Tooltip
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar
                                dataKey="qty"
                                fill="#f59e0b"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={50}
                                className="cursor-pointer"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {selectedBucket && (
                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <h4 className="font-semibold text-sm mb-4 text-amber-600 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            Stuck Products – {selectedBucket}
                        </h4>

                        {tableLoading ? (
                            <div className="text-center text-sm text-slate-500 py-4 font-medium animate-pulse">
                                Loading products...
                            </div>
                        ) : products.length === 0 ? (
                            <div className="text-center text-sm text-slate-500 py-4 bg-slate-50 rounded-lg border border-slate-100 border-dashed">
                                No products found for this period.
                            </div>
                        ) : (
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead className="text-right">Qty</TableHead>
                                            <TableHead className="text-right">Days</TableHead>
                                            <TableHead className="text-right">Value ₹</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {products.map((p) => (
                                            <TableRow key={p._id}>
                                                <TableCell className="font-medium text-slate-700">{p.name}</TableCell>
                                                <TableCell className="text-right">{p.stockQty}</TableCell>
                                                <TableCell className="text-right text-amber-600 font-medium">
                                                    {p.ageingDays}
                                                </TableCell>
                                                <TableCell className="text-right text-slate-600">
                                                    {p.stockValue.toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
