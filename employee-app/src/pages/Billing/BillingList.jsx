// src/pages/Billing/BillingList.jsx
import React, { useEffect, useState, useRef } from "react";
import api from "../../api/api";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function BillingList() {
    const [bills, setBills] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const [contextPos, setContextPos] = useState(null);
    const [selectedBill, setSelectedBill] = useState(null);

    const contextRef = useRef();
    const navigate = useNavigate();

    useEffect(() => {
        loadBills();
    }, []);

    useEffect(() => {
        filterBills();
    }, [search, bills]);

    const loadBills = async () => {
        try {
            setLoading(true);
            const r = await api.get("/invoices");
            const invoices = r.data.data || [];

            const formatted = invoices.map(inv => {
                const paid = Array.isArray(inv.payments)
                    ? inv.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
                    : 0;

                const due = Math.max(0, Number(inv.total || 0) - paid);

                return {
                    ...inv,
                    paidAmount: paid,
                    dueAmount: due,
                };
            });

            setBills(formatted);
            setFiltered(formatted);
        } finally {
            setLoading(false);
        }
    };

    const filterBills = () => {
        const s = search.toLowerCase();
        setFiltered(
            bills.filter(b =>
                (b.customerName || "").toLowerCase().includes(s) ||
                (b.customerPhone || "").toLowerCase().includes(s) ||
                (b.customerAddress || "").toLowerCase().includes(s)
            )
        );
    };

    const openContext = (e, bill) => {
        e.preventDefault();
        setSelectedBill(bill);
        setContextPos({ x: e.clientX, y: e.clientY });
    };

    const closeContext = () => setContextPos(null);

    const deleteBill = async (id) => {
        if (!window.confirm("Delete this invoice?")) return;
        try {
            await api.delete(`/invoices/${id}`);
            loadBills();
        } catch {
            alert("Failed to delete");
        }
        closeContext();
    };

    useEffect(() => {
        const handler = (e) => {
            if (contextRef.current && !contextRef.current.contains(e.target)) {
                closeContext();
            }
        };
        document.addEventListener("click", handler);
        return () => document.removeEventListener("click", handler);
    }, []);

    return (
        <div className="p-6 space-y-6">
            {/* HEADER */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">🧾 Billing Management</h1>

                {/* ✅ FIXED ROUTE */}
                <button
                    onClick={() => navigate("/billing/create")}
                    className="bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-teal-700"
                >
                    <Plus size={18} /> New Bill
                </button>
            </div>

            {/* SEARCH */}
            <div className="bg-white p-4 rounded-xl shadow flex gap-3 items-center">
                <input
                    type="text"
                    placeholder="Search by name, phone, address..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 border px-4 py-2 rounded-lg"
                />
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="bg-teal-100 text-left text-sm font-semibold">
                            <th className="p-3">Date</th>
                            <th className="p-3">Name</th>
                            <th className="p-3">Phone</th>
                            <th className="p-3">Address</th>
                            <th className="p-3">Total</th>
                            <th className="p-3">Paid</th>
                            <th className="p-3">Due</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="7" className="p-4 text-center">Loading...</td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="p-4 text-center">No bills found</td>
                            </tr>
                        ) : (
                            filtered.map((b) => (
                                <tr
                                    key={b._id}
                                    className="hover:bg-gray-50 cursor-pointer"
                                    onClick={() => navigate(`/billing/${b._id}`)}
                                    onContextMenu={(e) => openContext(e, b)}
                                >
                                    <td className="p-3">
                                        {new Date(b.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-3">{b.customerName}</td>
                                    <td className="p-3">{b.customerPhone}</td>
                                    <td className="p-3">{b.customerAddress}</td>
                                    <td className="p-3 font-semibold">₹{b.total}</td>
                                    <td className="p-3 text-green-600 font-semibold">₹{b.paidAmount}</td>
                                    <td className="p-3 text-red-600 font-semibold">₹{b.dueAmount}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* CONTEXT MENU */}
            {contextPos && selectedBill && (
                <div
                    ref={contextRef}
                    className="absolute bg-white shadow-lg rounded-md border w-40"
                    style={{ top: contextPos.y, left: contextPos.x, zIndex: 50 }}
                >
                    <button
                        onClick={() => deleteBill(selectedBill._id)}
                        className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
                    >
                        🗑 Delete
                    </button>
                </div>
            )}
        </div>
    );
}
