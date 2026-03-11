import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Plus, FileText, ArrowLeft, Printer, Download } from "lucide-react";
import { Card } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/Table";
import Badge from "../components/ui/Badge";

/* ---------- HELPERS ---------- */
const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { month: "short", day: "2-digit", year: "numeric" }) : "-";

const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function InvoiceList() {
    const navigate = useNavigate();
    const listRef = useRef(null);

    const [invoices, setInvoices] = useState([]);
    const [filter, setFilter] = useState("all");
    const [loading, setLoading] = useState(true);

    const loadInvoices = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/invoices?type=${filter}`);
            setInvoices(res.data.data || []);
        } catch (err) {
            console.error(err);
            setInvoices([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInvoices();
    }, [filter]);

    /* ---------- PDF ---------- */
    const downloadPDF = async () => {
        const canvas = await html2canvas(listRef.current, { scale: 2 });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const w = pdf.internal.pageSize.getWidth();
        const h = (canvas.height * w) / canvas.width;
        pdf.addImage(imgData, "PNG", 0, 0, w, h);
        pdf.save(`Invoices-${filter}.pdf`);
    };

    return (
        <div className="space-y-6">
            {/* ACTION BAR */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
                <Button variant="secondary" onClick={() => navigate(-1)} icon={ArrowLeft}>
                    Back
                </Button>

                <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="secondary" onClick={() => window.print()} icon={Printer} className="flex-1 sm:flex-none">
                        Print
                    </Button>
                    <Button onClick={downloadPDF} icon={Download} className="flex-1 sm:flex-none">
                        PDF Download
                    </Button>
                </div>
            </div>

            {/* CONTENT */}
            <div ref={listRef} className="space-y-6">
                {/* HEADER */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Invoices
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">Manage and view all your billing invoices</p>
                    </div>

                    <Button onClick={() => navigate("/billing/new")} icon={Plus}>
                        Create Bill
                    </Button>
                </div>

                {/* FILTERS */}
                <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
                    {[
                        { key: "all", label: "All Invoices" },
                        { key: "order", label: "Order Invoices" },
                        { key: "product", label: "Product Invoices" },
                    ].map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap border
                            ${filter === f.key
                                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* LIST */}
                <Card>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Invoice No</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="text-right sticky right-0 bg-slate-50/90 backdrop-blur z-20 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.02)] border-l border-slate-100">Action</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan="7" className="h-32 text-center text-slate-500">
                                            Loading invoices...
                                        </TableCell>
                                    </TableRow>
                                ) : invoices.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan="7" className="h-32 text-center text-slate-500">
                                            No invoices found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    invoices.map((inv) => (
                                        <TableRow key={inv._id} className="group">
                                            <TableCell className="font-semibold text-slate-800">
                                                {inv.invoiceNumber}
                                            </TableCell>
                                            <TableCell className="capitalize text-slate-600">
                                                {inv.invoiceType}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {inv.customerName || "Walk-in"}
                                            </TableCell>
                                            <TableCell className="text-slate-500 whitespace-nowrap">
                                                {fmtDate(inv.createdAt)}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-slate-900">
                                                {money(inv.total)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge
                                                    variant={
                                                        inv.status === "paid" ? "success"
                                                            : inv.status === "partial" ? "warning"
                                                                : "danger"
                                                    }
                                                >
                                                    {inv.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right sticky right-0 bg-white group-hover:bg-slate-50/80 z-10 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.05)] border-l border-slate-100">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() =>
                                                        inv.invoiceType === "order"
                                                            ? navigate(`/invoice/order/${inv._id}`)
                                                            : navigate(`/invoice/product/${inv._id}`)
                                                    }
                                                    icon={FileText}
                                                >
                                                    View
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </div>
        </div>
    );
}
