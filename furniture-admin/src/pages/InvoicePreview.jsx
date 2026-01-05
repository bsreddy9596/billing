import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/api";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Printer, ArrowLeft, Download } from "lucide-react";

/* ---------- HELPERS ---------- */
const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN") : "-";

const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

export default function InvoicePreview() {
    const { id } = useParams(); // invoiceId
    const navigate = useNavigate();
    const invoiceRef = useRef(null);

    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);

    /* ---------- LOAD INVOICE ---------- */
    useEffect(() => {
        const loadInvoice = async () => {
            try {
                const res = await api.get(`/invoices/${id}`);
                setInvoice(res.data.data);
            } catch {
                setInvoice(null);
            } finally {
                setLoading(false);
            }
        };
        if (id) loadInvoice();
    }, [id]);

    /* ---------- PDF ---------- */
    const downloadPDF = async () => {
        const canvas = await html2canvas(invoiceRef.current, { scale: 2 });
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const w = pdf.internal.pageSize.getWidth();
        const h = (canvas.height * w) / canvas.width;
        pdf.addImage(imgData, "PNG", 0, 0, w, h);
        pdf.save(`${invoice.invoiceNumber}.pdf`);
    };

    if (loading) return <div className="p-8">Loading invoice…</div>;
    if (!invoice)
        return <div className="p-8 text-red-500">Invoice not found</div>;

    return (
        <div className="invoice-page bg-gray-100 min-h-screen py-6 print:bg-white">
            {/* ACTION BAR */}
            <div className="max-w-[820px] mx-auto flex justify-between mb-4 print:hidden">
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

            {/* INVOICE (A4 FIT) */}
            <div
                ref={invoiceRef}
                className="
          invoice-print
          relative
          w-[794px]          /* A4 width */
          mx-auto
          bg-white
          p-8
          text-[14px]
        "
            >
                {/* WATERMARK */}
                <img
                    src="/logo/logo.png"
                    alt="Watermark"
                    className="absolute inset-0 m-auto w-[380px] opacity-[0.08] pointer-events-none select-none"
                />

                <div className="relative z-10">
                    {/* HEADER */}
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <img
                                src="/logo/logo.png"
                                alt="Logo"
                                className="h-20 w-auto"
                            />
                            <div>
                                <h1 className="text-2xl font-bold">SNGR Furnitures</h1>
                                <p className="text-gray-500 text-sm">
                                    Old Bus Stand Road, Metpally
                                </p>
                                <p className="text-gray-500 text-sm">
                                    Phone: +91 9640044469
                                </p>
                            </div>
                        </div>

                        <div className="text-right text-sm">
                            <div><b>Date:</b> {fmtDate(invoice.createdAt)}</div>
                            <div>
                                <b>Invoice No:</b>{" "}
                                <span className="text-[#0e9a86] font-semibold">
                                    {invoice.invoiceNumber}
                                </span>
                            </div>
                        </div>
                    </div>

                    <hr className="my-4" />

                    {/* CUSTOMER */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <div><b>Customer:</b> {invoice.customerName}</div>
                            <div><b>Phone:</b> {invoice.customerPhone || "-"}</div>
                            <div><b>Address:</b> {invoice.customerAddress || "-"}</div>
                        </div>
                        <div className="text-right">
                            <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold
                  ${invoice.status === "paid"
                                        ? "bg-green-100 text-green-700"
                                        : invoice.status === "partial"
                                            ? "bg-orange-100 text-orange-700"
                                            : "bg-red-100 text-red-700"
                                    }`}
                            >
                                {invoice.status.toUpperCase()}
                            </span>
                        </div>
                    </div>

                    {/* ITEMS */}
                    <h3 className="mt-6 mb-2 font-semibold">Items</h3>
                    <table className="w-full border text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="border p-2 text-left">Description</th>
                                <th className="border p-2 text-right">Qty</th>
                                <th className="border p-2 text-right">Rate</th>
                                <th className="border p-2 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items.map((it, i) => (
                                <tr key={i}>
                                    <td className="border p-2">{it.description}</td>
                                    <td className="border p-2 text-right">{it.qty}</td>
                                    <td className="border p-2 text-right">{money(it.rate)}</td>
                                    <td className="border p-2 text-right font-medium">
                                        {money(it.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* PAYMENTS */}
                    <h3 className="mt-6 mb-2 font-semibold">Payments</h3>
                    {invoice.payments.length === 0 ? (
                        <p className="text-gray-500 text-sm">No payments recorded</p>
                    ) : (
                        <table className="w-full border text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="border p-2 text-left">Date</th>
                                    <th className="border p-2 text-left">Type</th>
                                    <th className="border p-2 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice.payments.map((p, i) => (
                                    <tr key={i}>
                                        <td className="border p-2">{fmtDate(p.date)}</td>
                                        <td className="border p-2 capitalize">{p.type}</td>
                                        <td className="border p-2 text-right">
                                            {money(p.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {/* TOTALS */}
                    <div className="mt-6 flex justify-end">
                        <div className="w-64 text-sm space-y-1">
                            <div className="flex justify-between">
                                <span>Total</span>
                                <span>{money(invoice.total)}</span>
                            </div>
                            <div className="flex justify-between text-green-600">
                                <span>Paid</span>
                                <span>{money(invoice.paidAmount)}</span>
                            </div>
                            <div className="flex justify-between font-bold border-t pt-1 text-red-600">
                                <span>Due</span>
                                <span>{money(invoice.dueAmount)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 text-center text-gray-500 text-xs">
                        Thank you for your business 🙏
                    </div>
                </div>
            </div>
        </div>
    );
}
