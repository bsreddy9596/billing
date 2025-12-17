import { useEffect, useState } from "react";
import api from "../../api/api";
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
        <div className="bg-white rounded-2xl shadow p-5">
            <h3 className="font-semibold text-lg mb-4">
                📈 Monthly Revenue
            </h3>

            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#6366f1"
                        strokeWidth={3}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
