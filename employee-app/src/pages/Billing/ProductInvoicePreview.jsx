import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import toast from "react-hot-toast";
import { Printer, ArrowLeft, Download, Plus } from "lucide-react";

const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN") : "-";

const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

export default function ProductInvoicePreview() {
    const { id } = useParams();
    const navigate = useNavigate();
    const invoiceRef = useRef(null);

    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);

    /* 🔹 PAYMENT STATE */
    const [payAmount, setPayAmount] = useState("");
    const [payType, setPayType] = useState("payment");

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

    useEffect(() => {
        loadInvoice();
    }, [id]);

    /* ✅ ADD PAYMENT (ONLY ACTION ALLOWED) */
    const addPayment = async () => {
        if (!payAmount || Number(payAmount) <= 0) {
            return toast.error("Enter valid amount");
        }

        try {
            await api.patch(`/invoices/${id}/payment`, {
                amount: Number(payAmount),
                type: payType,
                date: new Date(),
            });

            toast.success("Payment added");
            setPayAmount("");
            loadInvoice();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to add payment");
        }
    };

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

    /* 🔹 LAST PAYMENT INFO */
    const lastPayment =
        invoice.payments?.length > 0
            ? invoice.payments[invoice.payments.length - 1]
            : null;

    return (
        <div className="bg-gray-100 min-h-screen p-8 print:bg-white">
            {/* ACTION BAR */}
            <div className="max-w-5xl mx-auto flex justify-between mb-6 print:hidden">
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

            {/* INVOICE */}
            <div
                ref={invoiceRef}
                className="relative max-w-5xl mx-auto bg-white rounded-xl shadow-lg p-10 text-[15px]"
            >
                {/* HEADER */}
                <div className="flex justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">SNGR Furnitures</h1>
                        <p className="text-gray-500">Old Bus Stand Road, Metpally</p>
                        <p className="text-gray-500">+91 9640044469</p>
                    </div>

                    <div className="text-right">
                        <div>Date: {fmtDate(invoice.createdAt)}</div>
                        <div className="font-semibold text-[#0e9a86]">
                            {invoice.invoiceNumber}
                        </div>
                    </div>
                </div>

                <hr className="my-6" />

                {/* CUSTOMER DETAILS */}
                <div className="grid grid-cols-2 text-sm mb-4">
                    <div>
                        <div><b>Customer:</b> {invoice.customerName}</div>
                        <div><b>Phone:</b> {invoice.customerPhone || "-"}</div>
                        <div><b>Address:</b> {invoice.customerAddress || "-"}</div>
                    </div>

                    <div className="text-right">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            {invoice.status.toUpperCase()}
                        </span>
                    </div>
                </div>

                {/* ITEMS */}
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
                                <td className="border p-2 text-right">
                                    {money(it.rate)}
                                </td>
                                <td className="border p-2 text-right">
                                    {money(it.amount)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* ADD PAYMENT (ONLY ACTION) */}
                {invoice.status !== "paid" && (
                    <div className="mt-6 flex gap-2 items-center print:hidden">
                        <select
                            value={payType}
                            onChange={(e) => setPayType(e.target.value)}
                            className="border px-3 py-2 rounded"
                        >
                            <option value="advance">Advance</option>
                            <option value="payment">Payment</option>
                        </select>

                        <input
                            type="number"
                            placeholder="Amount"
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                            className="border px-3 py-2 rounded w-40"
                        />

                        <button
                            onClick={addPayment}
                            className="flex items-center gap-2 px-4 py-2 bg-[#0e9a86] text-white rounded"
                        >
                            <Plus size={16} /> Add Payment
                        </button>
                    </div>
                )}

                {/* TOTALS */}
                <div className="mt-6 text-right">
                    <div>Total: {money(invoice.total)}</div>
                    <div className="text-green-600">
                        Paid: {money(invoice.paidAmount)}
                    </div>
                    <div className="font-bold text-red-600">
                        Due: {money(invoice.dueAmount)}
                    </div>
                </div>

                {/* META FOOTER */}
                <div className="mt-8 text-sm text-gray-600 border-t pt-3 grid grid-cols-2">
                    <div>
                        <b>Created By:</b>{" "}
                        {invoice.createdBy?.name || "System"}
                    </div>

                    <div className="text-right">
                        <b>Last Payment Added By:</b>{" "}
                        {lastPayment?.receivedBy?.name || "-"}
                    </div>
                </div>
            </div>
        </div>
    );
}
