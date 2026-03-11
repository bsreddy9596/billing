// src/pages/EmployeeLedger.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/api";
import { User2, CalendarDays, Pencil, Trash2, ArrowLeft, PlusCircle, X } from "lucide-react";
import { Card, CardContent } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Input, Label } from "../components/ui/Input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/Table";
import Badge from "../components/ui/Badge";

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
                className="w-full flex h-10 items-center border border-slate-300 px-3 py-2 rounded-lg cursor-pointer bg-white text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
            >
                {value === "credit" ? "Credit (+)" : "Debit (-)"}
            </div>

            {open && (
                <div className="absolute w-full bg-white border border-slate-200 rounded-lg mt-1 shadow-lg z-50 overflow-hidden">
                    {options.map((opt) => (
                        <div
                            key={opt.value}
                            onClick={() => {
                                onChange(opt.value);
                                setOpen(false);
                            }}
                            className="px-3 py-2 text-sm cursor-pointer hover:bg-primary-50 hover:text-primary-700 transition"
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
    const navigate = useNavigate();

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
        <div className="space-y-6">

            {/* HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <Button variant="secondary" size="sm" onClick={() => navigate(-1)} icon={ArrowLeft} className="px-2" />
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Employee Ledger
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">Manage advances and deductions</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="bg-white border rounded-lg px-3 py-2 flex items-center gap-2 shadow-sm w-full sm:w-auto">
                        <CalendarDays size={16} className="text-slate-400" />
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="text-sm border-none focus:ring-0 p-0 text-slate-700 bg-transparent w-full"
                        />
                        {selectedMonth && (
                            <button onClick={() => setSelectedMonth("")} className="text-xs text-primary-600 hover:text-primary-800 ml-2 font-medium">
                                Clear
                            </button>
                        )}
                    </div>

                    <Button onClick={() => setShowModal(true)} icon={PlusCircle} className="whitespace-nowrap hidden sm:flex">
                        Add Entry
                    </Button>
                </div>
            </div>

            {/* Employee Card & Balances */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Employee Info Card */}
                <Card className="lg:col-span-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white border-primary-800">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-6">
                            <div className="flex items-center gap-4">
                                <div className="bg-white/20 p-4 rounded-xl flex-shrink-0">
                                    <User2 size={32} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white">{employee.name}</h2>
                                    <div className="flex items-center gap-4 mt-2 text-primary-100 text-sm">
                                        <span>Code: <span className="text-white font-medium">{employee.employeeCode}</span></span>
                                        <span>•</span>
                                        <span>Phone: <span className="text-white font-medium">{employee.phone || "N/A"}</span></span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-left sm:text-right bg-black/10 p-4 rounded-xl w-full sm:w-auto">
                                <p className="text-xs font-semibold uppercase tracking-wider text-primary-200">Current Balance</p>
                                <p className={`text-3xl font-extrabold mt-1 ${balance >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                                    {balance < 0 ? "-" : ""}₹{Math.abs(balance).toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {/* Mobile Add Entry Button */}
                        <div className="mt-6 sm:hidden">
                            <Button variant="secondary" onClick={() => setShowModal(true)} className="w-full bg-white text-primary-700 hover:bg-primary-50 border-transparent">
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Entry
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Net Summary Metrics */}
                <Card>
                    <CardContent className="p-6 flex flex-col justify-center h-full space-y-6">
                        <div className="flex justify-between items-end border-b border-slate-100 pb-4">
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Credits (+)</p>
                                <p className="text-xl font-bold text-emerald-600 mt-1">₹{totalCredit.toLocaleString()}</p>
                            </div>
                            <div className="text-emerald-500 bg-emerald-50 px-2 py-1 rounded text-xs font-medium">+ Entries</div>
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Debits (-)</p>
                                <p className="text-xl font-bold text-rose-600 mt-1">₹{totalDebit.toLocaleString()}</p>
                            </div>
                            <div className="text-rose-500 bg-rose-50 px-2 py-1 rounded text-xs font-medium">- Deductions</div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* TABLE */}
            <Card>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Note</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right sticky right-0 bg-slate-50/90 backdrop-blur z-20 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.02)] border-l border-slate-100">Actions</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {filteredTxns.length > 0 ? (
                                filteredTxns.map((txn) => (
                                    <TableRow key={txn._id} className="group">
                                        <TableCell className="text-slate-600">
                                            {new Date(txn.date).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={txn.type === "credit" ? "success" : "danger"} className="capitalize">
                                                {txn.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-slate-700 max-w-[200px] truncate" title={txn.note}>
                                            {txn.note || <span className="text-slate-400">—</span>}
                                        </TableCell>
                                        <TableCell className={`text-right font-bold ${txn.type === "credit" ? "text-emerald-600" : "text-rose-600"}`}>
                                            {txn.type === "credit" ? "+" : "-"}₹{txn.amount.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right sticky right-0 bg-white group-hover:bg-slate-50/80 z-10 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.05)] border-l border-slate-100">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-slate-400 hover:text-primary-600"
                                                    onClick={() => openEditModal(txn)}
                                                >
                                                    <Pencil size={16} />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
                                                    onClick={() => deleteEntry(txn._id)}
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan="5" className="h-32 text-center text-slate-500">
                                        {selectedMonth ? `No transactions found for ${selectedMonth}.` : "No transactions recorded yet."}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>


            {/* ADD / EDIT ENTRY MODALS */}
            {(showModal || editModal) && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <Card className="w-full max-w-md shadow-xl animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100">
                            <h2 className="text-lg font-semibold text-slate-900">
                                {editModal ? "Edit Ledger Entry" : "Add Ledger Entry"}
                            </h2>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-full"
                                onClick={() => {
                                    setShowModal(false);
                                    setEditModal(false);
                                }}
                            >
                                <X size={18} />
                            </Button>
                        </div>

                        <CardContent className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <Label>Entry Type</Label>
                                    <CustomSelect
                                        value={editModal ? editEntry.type : entry.type}
                                        onChange={(v) => editModal
                                            ? setEditEntry({ ...editEntry, type: v })
                                            : setEntry({ ...entry, type: v })
                                        }
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Credit adds to balance (advance), Debit deducts from balance.
                                    </p>
                                </div>

                                <div>
                                    <Label>Amount (₹)</Label>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        min="0"
                                        value={editModal ? editEntry.amount : entry.amount}
                                        onChange={(e) => editModal
                                            ? setEditEntry({ ...editEntry, amount: e.target.value })
                                            : setEntry({ ...entry, amount: e.target.value })
                                        }
                                    />
                                </div>

                                <div>
                                    <Label>Note / Description (Optional)</Label>
                                    <Input
                                        placeholder="e.g. Salary Advance, Loan Deduction..."
                                        value={editModal ? editEntry.note : entry.note}
                                        onChange={(e) => editModal
                                            ? setEditEntry({ ...editEntry, note: e.target.value })
                                            : setEntry({ ...entry, note: e.target.value })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-100">
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setShowModal(false);
                                        setEditModal(false);
                                    }}
                                >
                                    Cancel
                                </Button>

                                <Button onClick={editModal ? updateEntry : saveEntry}>
                                    {editModal ? "Update Entry" : "Save Entry"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
