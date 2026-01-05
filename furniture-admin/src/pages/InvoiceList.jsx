import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Plus, FileText, ArrowLeft, Printer, Download } from "lucide-react";

/* ---------- HELPERS ---------- */
const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN") : "-";

const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

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
        <div className="bg-gray-100 min-h-screen p-8">
            {/* ACTION BAR (same style as InvoicePreview) */}
            <div className="max-w-6xl mx-auto flex justify-between mb-6 print:hidden">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 px-4 py-2 border rounded bg-white"
                >
                    <ArrowLeft size={16} /> Back
                </button>

                <div className="flex gap-2">
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 border rounded bg-white"
                    >
                        <Printer size={16} /> Print
                    </button>
                    <button
                        onClick={downloadPDF}
                        className="flex items-center gap-2 px-4 py-2 rounded bg-[#0e9a86] text-white"
                    >
                        <Download size={16} /> PDF
                    </button>
                </div>
            </div>

            {/* CONTENT */}
            <div ref={listRef} className="max-w-6xl mx-auto space-y-6">
                {/* HEADER */}
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">
                        Invoices
                    </h1>

                    <button
                        onClick={() => navigate("/billing/new")}
                        className="flex items-center gap-2 px-4 py-2 rounded bg-[#0e9a86] text-white"
                    >
                        <Plus size={16} /> Create Bill
                    </button>

                </div>

                {/* FILTERS */}
                <div className="flex gap-2">
                    {[
                        { key: "all", label: "All" },
                        { key: "order", label: "Order Invoices" },
                        { key: "product", label: "Product Invoices" },
                    ].map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`px-4 py-2 rounded border text-sm font-medium
                            ${filter === f.key
                                    ? "bg-black text-white"
                                    : "bg-white hover:bg-gray-100"
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* LIST */}
                <div className="bg-white rounded-xl shadow overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100 text-gray-600">
                            <tr>
                                <th className="p-3 text-left">Invoice No</th>
                                <th className="p-3 text-left">Type</th>
                                <th className="p-3 text-left">Customer</th>
                                <th className="p-3 text-left">Date</th>
                                <th className="p-3 text-right">Total</th>
                                <th className="p-3 text-center">Status</th>
                                <th className="p-3 text-right">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="p-6 text-center text-gray-400">
                                        Loading invoices…
                                    </td>
                                </tr>
                            ) : invoices.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-6 text-center text-gray-400">
                                        No invoices found
                                    </td>
                                </tr>
                            ) : (
                                invoices.map((inv) => (
                                    <tr key={inv._id} className="border-t">
                                        <td className="p-3 font-medium">
                                            {inv.invoiceNumber}
                                        </td>
                                        <td className="p-3 capitalize">
                                            {inv.invoiceType}
                                        </td>
                                        <td className="p-3">
                                            {inv.customerName || "Walk-in"}
                                        </td>
                                        <td className="p-3">
                                            {fmtDate(inv.createdAt)}
                                        </td>
                                        <td className="p-3 text-right font-semibold">
                                            {money(inv.total)}
                                        </td>
                                        <td className="p-3 text-center">
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-semibold
                                                ${inv.status === "paid"
                                                        ? "bg-green-100 text-green-700"
                                                        : inv.status === "partial"
                                                            ? "bg-orange-100 text-orange-700"
                                                            : "bg-red-100 text-red-700"
                                                    }`}
                                            >
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right">
                                            <button
                                                onClick={() =>
                                                    inv.invoiceType === "order"
                                                        ? navigate(`/invoice/order/${inv._id}`)
                                                        : navigate(`/invoice/product/${inv._id}`)
                                                }

                                                className="inline-flex items-center gap-1 text-[#0e9a86] hover:underline"
                                            >
                                                <FileText size={14} /> View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
