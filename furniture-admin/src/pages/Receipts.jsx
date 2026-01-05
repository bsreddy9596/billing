import React, { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import {
    Trash2,
    FileText,
    Search,
    ArrowLeft,
    Download,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const fmt = (d) => new Date(d).toLocaleDateString("en-IN");

export default function AdminReceipts() {
    const navigate = useNavigate();

    const [receipts, setReceipts] = useState([]);
    const [search, setSearch] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");

    /* ================= LOAD RECEIPTS ================= */
    const loadReceipts = async () => {
        try {
            const res = await api.get("/receipts");
            setReceipts(res.data.data || []);
        } catch {
            toast.error("Failed to load receipts");
        }
    };

    useEffect(() => {
        loadReceipts();
    }, []);

    /* ================= SEARCH + DATE FILTER ================= */
    const filtered = useMemo(() => {
        return receipts.filter((r) => {
            const q = search.toLowerCase();
            const customer = (r.orderId?.customerName || "").toLowerCase();
            const phone = (r.orderId?.customerPhone || "").toLowerCase();
            const receiptNo = (r.receiptNo || "").toLowerCase();

            if (
                q &&
                !customer.includes(q) &&
                !receiptNo.includes(q) &&
                !phone.includes(q)
            )
                return false;

            const d = new Date(r.createdAt).getTime();
            if (from && d < new Date(from).getTime()) return false;
            if (to && d > new Date(to).getTime()) return false;

            return true;
        });
    }, [receipts, search, from, to]);

    /* ================= MONTHLY SUMMARY ================= */
    const monthly = useMemo(() => {
        const map = {};
        filtered.forEach((r) => {
            const key = new Date(r.createdAt).toLocaleString("en-IN", {
                month: "long",
                year: "numeric",
            });
            map[key] = (map[key] || 0) + Number(r.amount || 0);
        });
        return map;
    }, [filtered]);

    /* ================= DELETE RECEIPT ================= */
    const deleteReceipt = async (id) => {
        if (!window.confirm("Delete receipt?\nPayment will be rolled back."))
            return;

        try {
            await api.delete(`/receipts/${id}`);
            toast.success("Receipt deleted");
            loadReceipts();
        } catch {
            toast.error("Delete failed");
        }
    };

    /* ================= DOWNLOAD PDF (ALL RECEIPTS) ================= */
    const downloadPDF = async () => {
        const params = {};
        if (from) params.from = from;
        if (to) params.to = to;

        const res = await api.get("/receipts/pdf", {
            params,
            responseType: "blob",
        });

        const blob = new Blob([res.data], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "receipts-report.pdf";
        a.click();
        window.URL.revokeObjectURL(url);
    };


    return (
        <div className="p-6 bg-[#F7FFFC] min-h-screen space-y-6">
            {/* ================= HEADER ================= */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-lg border hover:bg-gray-50"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <h1 className="text-2xl font-bold text-[#0e9a86]">
                        Receipts
                    </h1>
                </div>

                {/* PDF BUTTON */}
                <button
                    onClick={downloadPDF}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0e9a86] text-white hover:bg-[#0c7f70]"
                >
                    <Download size={16} />
                    Download PDF
                </button>
            </div>

            {/* ================= FILTER BAR ================= */}
            <div className="bg-white rounded-2xl shadow p-4 flex flex-wrap gap-4 items-center">
                {/* SEARCH */}
                <div className="relative flex-1 min-w-[220px]">
                    <Search
                        className="absolute left-3 top-2.5 text-gray-400"
                        size={16}
                    />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search customer / mobile / receipt no"
                        className="pl-9 w-full border rounded-lg px-3 py-2 focus:ring-1 focus:ring-[#0e9a86]"
                    />
                </div>

                {/* FROM DATE */}
                <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="border rounded-lg px-3 py-2 w-40"
                />

                {/* TO DATE */}
                <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="border rounded-lg px-3 py-2 w-40"
                />

                {/* CLEAR */}
                <button
                    onClick={() => {
                        setSearch("");
                        setFrom("");
                        setTo("");
                    }}
                    className="border rounded-lg px-4 py-2 hover:bg-gray-50"
                >
                    Clear
                </button>
            </div>

            {/* ================= MONTHLY SUMMARY ================= */}
            {Object.keys(monthly).length > 0 && (
                <div className="bg-white rounded-2xl shadow p-4">
                    <div className="font-semibold mb-3 text-[#0e9a86]">
                        Monthly Receipt Summary
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        {Object.entries(monthly).map(([m, amt]) => (
                            <div
                                key={m}
                                className="border rounded-xl p-3 text-center bg-[#F0FFF7]"
                            >
                                <div className="text-gray-500">{m}</div>
                                <div className="font-bold text-green-700">
                                    ₹{amt.toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ================= TABLE ================= */}
            <div className="bg-white rounded-2xl shadow overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-[#F0FFF7] text-[#0e9a86]">
                        <tr>
                            <th className="p-3 text-left">Receipt No</th>
                            <th className="p-3 text-left">Customer</th>
                            <th className="p-3 text-left">Mobile</th>
                            <th className="p-3 text-right">Amount</th>
                            <th className="p-3 text-center">Date</th>
                            <th className="p-3 text-right">Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filtered.map((r) => (
                            <tr
                                key={r._id}
                                className="border-t hover:bg-gray-50"
                            >
                                <td className="p-3 font-semibold">
                                    {r.receiptNo}
                                </td>
                                <td className="p-3">
                                    {r.orderId?.customerName || "Walk-in"}
                                </td>
                                <td className="p-3">
                                    {r.orderId?.customerPhone || "-"}
                                </td>
                                <td className="p-3 text-right">
                                    ₹{Number(r.amount).toLocaleString()}
                                </td>
                                <td className="p-3 text-center">
                                    {fmt(r.createdAt)}
                                </td>
                                <td className="p-3 flex justify-end gap-2">
                                    <button
                                        onClick={() =>
                                            navigate(
                                                `/receipts/preview/${r._id}`
                                            )
                                        }
                                        className="p-2 border rounded-lg hover:bg-[#F0FFF7]"
                                    >
                                        <FileText size={15} />
                                    </button>

                                    <button
                                        onClick={() => deleteReceipt(r._id)}
                                        className="p-2 border rounded-lg text-red-600 hover:bg-red-50"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {filtered.length === 0 && (
                            <tr>
                                <td
                                    colSpan="6"
                                    className="p-6 text-center text-gray-400"
                                >
                                    No receipts found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
