import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Printer, ArrowLeft, Download } from "lucide-react";

const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN") : "-";

const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

export default function InvoicePreview() {
    const { id } = useParams();
    const navigate = useNavigate();
    const invoiceRef = useRef(null);

    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await api.get(`/invoices/${id}`);
                setInvoice(res.data.data);
            } catch {
                setInvoice(null);
            } finally {
                setLoading(false);
            }
        };
        if (id) load();
    }, [id]);

    const downloadPDF = async () => {
        const canvas = await html2canvas(invoiceRef.current, { scale: 2 });
        const img = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const w = pdf.internal.pageSize.getWidth();
        const h = (canvas.height * w) / canvas.width;
        pdf.addImage(img, "PNG", 0, 0, w, h);
        pdf.save(`${invoice.invoiceNumber}.pdf`);
    };

    if (loading) return <div className="p-8">Loading…</div>;
    if (!invoice) return <div className="p-8 text-red-500">Invoice not found</div>;

    return (
        <div className="bg-gray-100 min-h-screen py-6">
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
                        className="flex items-center gap-2 px-4 py-2 bg-[#0e9a86] text-white rounded"
                    >
                        <Download size={16} /> PDF
                    </button>
                </div>
            </div>

            <div
                ref={invoiceRef}
                className="relative w-[794px] mx-auto bg-white p-8 text-[14px]"
            >
                <img
                    src="/logo/logo.png"
                    className="absolute inset-0 m-auto w-[360px] opacity-[0.06]"
                />

                <div className="relative z-10">
                    <div className="flex justify-between">
                        <div className="flex gap-4">
                            <img src="/logo/logo.png" className="h-20" />
                            <div>
                                <h1 className="text-2xl font-bold">SNGR Furnitures</h1>
                                <p className="text-sm text-gray-500">Metpally</p>
                                <p className="text-sm text-gray-500">+91 9640044469</p>
                            </div>
                        </div>
                        <div className="text-sm text-right">
                            <div>Date: {fmtDate(invoice.createdAt)}</div>
                            <div className="font-semibold text-[#0e9a86]">
                                {invoice.invoiceNumber}
                            </div>
                        </div>
                    </div>

                    <hr className="my-4" />

                    <div className="grid grid-cols-2 text-sm mb-4">
                        <div>
                            <div><b>Customer:</b> {invoice.customerName}</div>
                            <div><b>Phone:</b> {invoice.customerPhone || "-"}</div>
                            <div><b>Address:</b> {invoice.customerAddress || "-"}</div>
                        </div>
                        <div className="text-right">
                            <span className="px-3 py-1 text-xs rounded-full bg-red-100 text-red-700">
                                {invoice.status.toUpperCase()}
                            </span>
                        </div>
                    </div>

                    <table className="w-full border text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="border p-2 text-left">Item</th>
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
                                    <td className="border p-2 text-right">{money(it.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="mt-6 flex justify-end">
                        <div className="w-64 text-sm">
                            <div className="flex justify-between">
                                <span>Total</span>
                                <span>{money(invoice.total)}</span>
                            </div>
                            <div className="flex justify-between text-green-600">
                                <span>Paid</span>
                                <span>{money(invoice.paidAmount)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-red-600 border-t pt-1">
                                <span>Due</span>
                                <span>{money(invoice.dueAmount)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 text-center text-xs text-gray-500">
                        Thank you for your business 🙏
                    </div>
                </div>
            </div>
        </div>
    );
}
