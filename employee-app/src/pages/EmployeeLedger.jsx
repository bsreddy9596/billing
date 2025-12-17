import { useEffect, useState } from "react";
import api from "../api/api";
import { User2, CalendarDays } from "lucide-react";

export default function EmployeeLedger() {
    const [transactions, setTransactions] = useState([]);
    const [employee, setEmployee] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState("");

    useEffect(() => {
        fetchLedger();
    }, []);

    const fetchLedger = async () => {
        try {
            const res = await api.get("/employees/ledger/my");
            setTransactions(res.data.data || []);
            setEmployee(res.data.employee || {});
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-6 text-center text-gray-500">Loading…</div>;
    }

    const filtered = selectedMonth
        ? transactions.filter(
            (t) =>
                new Date(t.createdAt).toISOString().slice(0, 7) ===
                selectedMonth
        )
        : transactions;

    const credit = filtered
        .filter((t) => t.type === "credit")
        .reduce((a, b) => a + b.amount, 0);

    const debit = filtered
        .filter((t) => t.type === "debit")
        .reduce((a, b) => a + b.amount, 0);

    const balance = credit - debit;

    return (
        <div className="p-6 space-y-6 bg-[#F6FFFC] min-h-screen">

            {/* HEADER */}
            <div className="bg-gradient-to-r from-[#00BFA6] to-[#00A28E] text-white rounded-xl p-6 shadow flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-full">
                        <User2 size={28} />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold">{employee.name}</h2>
                        <p className="text-sm opacity-90">
                            {employee.employeeCode} · {employee.phone}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm opacity-80">Balance</p>
                    <p className="text-3xl font-bold text-yellow-200">₹{balance}</p>
                </div>
            </div>

            {/* FILTER */}
            <div className="bg-white p-4 rounded-xl shadow flex items-center gap-4">
                <CalendarDays size={18} className="text-[#00A28E]" />
                <span className="font-medium">Month</span>
                <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="border rounded-lg px-3 py-1 text-sm"
                />
                {selectedMonth && (
                    <button
                        onClick={() => setSelectedMonth("")}
                        className="text-sm text-[#00A28E] underline"
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-xl shadow border overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                    <colgroup>
                        <col style={{ width: "18%" }} />
                        <col style={{ width: "18%" }} />
                        <col style={{ width: "44%" }} />
                        <col style={{ width: "20%" }} />
                    </colgroup>

                    <thead className="bg-[#E9FFFA] text-gray-700 border-b">
                        <tr>
                            <th className="px-4 py-3 text-left font-semibold">
                                DATE
                            </th>
                            <th className="px-4 py-3 text-left font-semibold">
                                TYPE
                            </th>
                            <th className="px-4 py-3 text-left font-semibold">
                                NOTE
                            </th>
                            <th className="px-4 py-3 text-right font-semibold">
                                AMOUNT
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {filtered.map((t) => (
                            <tr
                                key={t._id}
                                className={`border-b last:border-none ${t.type === "credit"
                                    ? "bg-green-50"
                                    : "bg-red-50"
                                    }`}
                            >
                                <td className="px-4 py-3">
                                    {new Date(t.createdAt).toLocaleDateString(
                                        "en-IN"
                                    )}
                                </td>
                                <td className="px-4 py-3 capitalize font-medium">
                                    {t.type}
                                </td>
                                <td className="px-4 py-3 text-gray-700">
                                    {t.note || "-"}
                                </td>
                                <td className="px-4 py-3 text-right font-semibold">
                                    ₹{t.amount}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* TOTALS */}
            <div className="bg-white rounded-xl border shadow p-5 flex justify-between text-sm font-semibold">
                <span className="text-green-600">Credits ₹{credit}</span>
                <span className="text-red-600">Debits ₹{debit}</span>
                <span className="text-[#00A28E]">Balance ₹{balance}</span>
            </div>
        </div>
    );
}
