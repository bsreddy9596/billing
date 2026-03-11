import { useEffect, useState } from "react";
import api from "../../api/api";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { BarChart2 } from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";

export default function MonthlyRevenueChart() {
    const [data, setData] = useState([]);

    useEffect(() => {
        api.get("/analytics/monthly").then((res) => {
            setData(res.data.data || []);
        });
    }, []);

    return (
        <Card className="shadow-none border-none border-slate-200">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-slate-400" />
                    Monthly Revenue Trend
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="w-full h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                            <Tooltip
                                cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                stroke="#4f46e5"
                                strokeWidth={3}
                                dot={{ fill: '#4f46e5', strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6, fill: '#fff', stroke: '#4f46e5', strokeWidth: 2 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
