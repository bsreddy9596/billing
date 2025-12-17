// src/pages/EmployeeLedger.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/api";
import { User2, CalendarDays, Pencil, Trash2 } from "lucide-react";

/* -------------------------------------------------------------------------- */
/* ⭐ CUSTOM SELECT DROPDOWN (Fixes Blue Hover Issue)                          */
/* -------------------------------------------------------------------------- */
function CustomSelect({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const options = [
        { label: "Credit", value: "credit" },
        { label: "Debit", value: "debit" },
    ];

    return (
        <div className="relative">
            <div
                onClick={() => setOpen(!open)}
                className="w-full border px-3 py-2 rounded-lg cursor-pointer bg-white"
            >
                {value === "credit" ? "Credit" : "Debit"}
            </div>

            {open && (
                <div className="absolute w-full bg-white border rounded-lg mt-1 shadow-lg z-50">
                    {options.map((opt) => (
                        <div
                            key={opt.value}
                            onClick={() => {
                                onChange(opt.value);
                                setOpen(false);
                            }}
                            className="px-3 py-2 cursor-pointer hover:bg-[#00A28E] hover:text-white transition"
                        >
                            {opt.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* MAIN LEDGER PAGE                                                           */
/* -------------------------------------------------------------------------- */

export default function EmployeeLedger() {
    const { id } = useParams();

    const [transactions, setTransactions] = useState([]);
    const [employee, setEmployee] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState("");

    // Add Modal
    const [showModal, setShowModal] = useState(false);
    const [entry, setEntry] = useState({
        type: "credit",
        amount: "",
        note: ""
    });

    // Edit Modal
    const [editModal, setEditModal] = useState(false);
    const [editEntry, setEditEntry] = useState({
        id: "",
        type: "credit",
        amount: "",
        note: ""
    });

    useEffect(() => {
        fetchLedger();
    }, []);

    const fetchLedger = async () => {
        try {
            const res = await api.get(`/employees/ledger/${id}`);
            setTransactions(res.data.data || []);
            setEmployee(res.data.employee || {});
        } catch (err) {
            console.error("Ledger fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    /* ------------------------------- ADD ENTRY ------------------------------ */
    const saveEntry = async () => {
        if (!entry.amount) return alert("Amount required!");

        try {
            await api.post("/employees/ledger", {
                employeeId: id,
                type: entry.type,
                amount: Number(entry.amount),
                note: entry.note
            });

            setShowModal(false);
            setEntry({ type: "credit", amount: "", note: "" });
            fetchLedger();
        } catch (err) {
            alert("Failed to add entry");
        }
    };

    /* ------------------------------- EDIT ENTRY ----------------------------- */
    const openEditModal = (txn) => {
        setEditEntry({
            id: txn._id,
            type: txn.type,
            amount: txn.amount,
            note: txn.note
        });
        setEditModal(true);
    };

    const updateEntry = async () => {
        try {
            await api.put(`/employees/ledger/${editEntry.id}`, {
                type: editEntry.type,
                amount: editEntry.amount,
                note: editEntry.note
            });

            setEditModal(false);
            fetchLedger();
        } catch (err) {
            alert("Update failed");
        }
    };

    /* ------------------------------ DELETE ENTRY ---------------------------- */
    const deleteEntry = async (entryId) => {
        if (!window.confirm("Delete this entry?")) return;

        try {
            await api.delete(`/employees/ledger/${entryId}`);
            fetchLedger();
        } catch (err) {
            alert("Delete failed");
        }
    };

    if (loading)
        return <div className="p-6 text-center text-gray-500 animate-pulse">⏳ Loading...</div>;

    /* --------------------------- Filter + Totals ---------------------------- */
    const filteredTxns = selectedMonth
        ? transactions.filter((t) => new Date(t.date).toISOString().slice(0, 7) === selectedMonth)
        : transactions;

    const totalCredit = filteredTxns.filter(t => t.type === "credit").reduce((sum, t) => sum + t.amount, 0);
    const totalDebit = filteredTxns.filter(t => t.type === "debit").reduce((sum, t) => sum + t.amount, 0);
    const balance = totalCredit - totalDebit;

    /* -------------------------------------------------------------------------- */
    /* PAGE UI                                                                    */
    /* -------------------------------------------------------------------------- */

    return (
        <div className="p-6 space-y-6 bg-gradient-to-br from-white via-[#F0FFFB] to-[#E6FFF8] min-h-screen">

            {/* Employee Card */}
            <div className="bg-gradient-to-r from-[#00BFA6] to-[#00A28E] text-white rounded-2xl p-6 shadow-lg flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-3 rounded-full">
                        <User2 size={30} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{employee.name}</h1>
                        <p className="text-sm opacity-90">Code: {employee.employeeCode}</p>
                        <p className="text-sm opacity-90">Phone: {employee.phone}</p>
                    </div>
                </div>

                <div className="text-right">
                    <p className="text-sm opacity-80">Current Balance</p>
                    <p className="text-3xl font-extrabold text-yellow-200">₹{balance}</p>

                    <button
                        onClick={() => setShowModal(true)}
                        className="mt-3 bg-white text-[#00A28E] px-4 py-2 rounded-xl shadow font-semibold hover:bg-gray-100 transition"
                    >
                        + Add Entry
                    </button>
                </div>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-3 bg-white p-4 rounded-xl shadow border">
                <CalendarDays size={20} className="text-[#00BFA6]" />
                <label>Filter by Month:</label>
                <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="border px-3 py-1 rounded-lg"
                />
                {selectedMonth && (
                    <button onClick={() => setSelectedMonth("")} className="text-[#00BFA6] underline text-sm">
                        Clear
                    </button>
                )}
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-2xl shadow-lg border overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-[#E0FFF5] uppercase text-xs border-b">
                        <tr>
                            <th className="p-3">📅 Date</th>
                            <th className="p-3">🔖 Type</th>
                            <th className="p-3">📝 Note</th>
                            <th className="p-3">💰 Amount</th>
                            <th className="p-3 text-center">⚙ Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filteredTxns.length > 0 ? (
                            filteredTxns.map((txn) => (
                                <tr
                                    key={txn._id}
                                    className={`border-b ${txn.type === "credit" ? "bg-green-50" : "bg-red-50"}`}
                                >
                                    <td className="p-3">{new Date(txn.date).toLocaleDateString("en-IN")}</td>
                                    <td className="p-3 capitalize">{txn.type}</td>
                                    <td className="p-3">{txn.note || "—"}</td>
                                    <td className="p-3 font-semibold">₹{txn.amount}</td>

                                    <td className="p-3 flex justify-center gap-3">
                                        <button
                                            className="text-blue-600 hover:text-blue-800 transition"
                                            onClick={() => openEditModal(txn)}
                                        >
                                            <Pencil size={18} />
                                        </button>

                                        <button
                                            className="text-red-600 hover:text-red-800 transition"
                                            onClick={() => deleteEntry(txn._id)}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="text-center text-gray-500 py-6">
                                    No transactions found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* TOTALS */}
            <div className="bg-[#F0FFFB] border border-[#00BFA6]/30 rounded-xl p-5 flex justify-between">
                <p className="text-green-600 font-semibold">Total Credits: ₹{totalCredit}</p>
                <p className="text-red-600 font-semibold">Total Debits: ₹{totalDebit}</p>
                <p className="text-[#00A28E] font-bold">Net Balance: ₹{balance}</p>
            </div>

            {/* ADD ENTRY MODAL */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl w-[90%] max-w-md shadow-xl">
                        <h2 className="text-xl font-semibold mb-4">Add Ledger Entry</h2>

                        <div className="space-y-3">
                            <CustomSelect
                                value={entry.type}
                                onChange={(v) => setEntry({ ...entry, type: v })}
                            />

                            <input
                                type="number"
                                placeholder="Amount"
                                value={entry.amount}
                                onChange={(e) => setEntry({ ...entry, amount: e.target.value })}
                                className="w-full border px-3 py-2 rounded-lg"
                            />

                            <textarea
                                placeholder="Note"
                                value={entry.note}
                                onChange={(e) => setEntry({ ...entry, note: e.target.value })}
                                className="w-full border px-3 py-2 rounded-lg"
                            />
                        </div>

                        <div className="flex gap-3 mt-5">
                            <button
                                onClick={saveEntry}
                                className="flex-1 bg-[#00A28E] text-white py-2 rounded-lg hover:bg-[#008f7a] transition"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 border py-2 rounded-lg hover:bg-gray-100 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT ENTRY MODAL */}
            {editModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl w-[90%] max-w-md shadow-xl">
                        <h2 className="text-xl font-semibold mb-4">Edit Entry</h2>

                        <div className="space-y-3">
                            <CustomSelect
                                value={editEntry.type}
                                onChange={(v) => setEditEntry({ ...editEntry, type: v })}
                            />

                            <input
                                type="number"
                                value={editEntry.amount}
                                onChange={(e) => setEditEntry({ ...editEntry, amount: e.target.value })}
                                className="w-full border px-3 py-2 rounded-lg"
                            />

                            <textarea
                                value={editEntry.note}
                                onChange={(e) => setEditEntry({ ...editEntry, note: e.target.value })}
                                className="w-full border px-3 py-2 rounded-lg"
                            />
                        </div>

                        <div className="flex gap-3 mt-5">
                            <button
                                onClick={updateEntry}
                                className="flex-1 bg-[#00A28E] text-white py-2 rounded-lg hover:bg-[#008f7a] transition"
                            >
                                Update
                            </button>

                            <button
                                onClick={() => setEditModal(false)}
                                className="flex-1 border py-2 rounded-lg hover:bg-gray-100 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
