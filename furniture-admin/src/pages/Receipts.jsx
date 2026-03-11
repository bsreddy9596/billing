import React, { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import {
    Trash2,
    FileText,
    Search,
    ArrowLeft,
    Download,
    Receipt,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { Card, CardContent } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import Button from "../components/ui/Button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/Table";

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
        <div className="space-y-6">
            {/* ================= HEADER ================= */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <Button variant="secondary" size="sm" onClick={() => navigate(-1)} icon={ArrowLeft} className="px-2" />
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                            <Receipt className="text-primary-600" />
                            Receipts
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">View and manage payment receipts</p>
                    </div>
                </div>

                {/* PDF BUTTON */}
                <Button onClick={downloadPDF} icon={Download} className="w-full sm:w-auto">
                    Download PDF
                </Button>
            </div>

            {/* ================= FILTER BAR ================= */}
            <Card>
                <CardContent className="p-4 flex flex-wrap gap-4 items-center">
                    {/* SEARCH */}
                    <div className="relative flex-1 min-w-[220px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400" />
                        </div>
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search customer, mobile, or receipt no..."
                            className="pl-10 h-10"
                        />
                    </div>

                    <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                        {/* FROM DATE */}
                        <Input
                            type="date"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            className="w-full sm:w-40 h-10"
                            title="From Date"
                        />

                        {/* TO DATE */}
                        <Input
                            type="date"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="w-full sm:w-40 h-10"
                            title="To Date"
                        />

                        {/* CLEAR */}
                        <Button
                            variant="secondary"
                            className="h-10 px-4 w-full sm:w-auto"
                            onClick={() => {
                                setSearch("");
                                setFrom("");
                                setTo("");
                            }}
                        >
                            Clear
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* ================= MONTHLY SUMMARY ================= */}
            {Object.keys(monthly).length > 0 && (
                <Card>
                    <CardContent className="p-5">
                        <div className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            Monthly Receipt Summary
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                            {Object.entries(monthly).map(([m, amt]) => (
                                <div
                                    key={m}
                                    className="border border-slate-100 rounded-xl p-4 text-center bg-slate-50/50 hover:bg-primary-50 hover:border-primary-100 transition-colors"
                                >
                                    <div className="text-slate-500 font-medium">{m}</div>
                                    <div className="font-bold text-lg text-primary-700 mt-1">
                                        ₹{amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ================= TABLE ================= */}
            <Card>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Receipt No</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Mobile</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-center">Date</TableHead>
                                <TableHead className="text-right sticky right-0 bg-slate-50/90 backdrop-blur z-20 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.02)] border-l border-slate-100">Actions</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {filtered.length > 0 ? (
                                filtered.map((r) => (
                                    <TableRow key={r._id} className="group">
                                        <TableCell className="font-semibold text-slate-800">
                                            {r.receiptNo}
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-700">
                                            {r.orderId?.customerName || "Walk-in"}
                                        </TableCell>
                                        <TableCell className="text-slate-600">
                                            {r.orderId?.customerPhone || "—"}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-emerald-600">
                                            ₹{Number(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="text-center text-slate-500">
                                            {fmt(r.createdAt)}
                                        </TableCell>
                                        <TableCell className="text-right sticky right-0 bg-white group-hover:bg-slate-50/80 z-10 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.05)] border-l border-slate-100">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-slate-400 hover:text-primary-600"
                                                    onClick={() => navigate(`/receipts/preview/${r._id}`)}
                                                >
                                                    <FileText size={16} />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
                                                    onClick={() => deleteReceipt(r._id)}
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan="6"
                                        className="h-32 text-center text-slate-500"
                                    >
                                        No receipts found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}
