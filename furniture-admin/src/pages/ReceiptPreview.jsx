// src/pages/ReceiptPreview.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/api";
import { Printer, ArrowLeft, Download } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const fmt = (d) => new Date(d).toLocaleDateString("en-IN");

export default function ReceiptPreview() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [receipt, setReceipt] = useState(null);
    const receiptRef = useRef(null);

    useEffect(() => {
        api.get(`/receipts/${id}`).then((res) => {
            setReceipt(res.data.data);
        });
    }, [id]);

    if (!receipt) return <div className="p-6">Loading…</div>;

    const order = receipt.orderId || {};
    const items = order.drawings || [];

    /* PDF DOWNLOAD */
    const downloadPDF = async () => {
        if (!receiptRef.current) return;

        const canvas = await html2canvas(receiptRef.current, {
            scale: 2,
            useCORS: true,
        });

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${receipt.receiptNo}.pdf`);
    };

    return (
        <div className="min-h-screen bg-[#F7FFFC] p-6">
            {/* ACTION BAR */}
            <div className="flex justify-between mb-4 print:hidden">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 border px-3 py-1 rounded bg-white"
                >
                    <ArrowLeft size={16} /> Back
                </button>

                <div className="flex gap-2">
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 border px-3 py-1 rounded bg-white"
                    >
                        <Printer size={16} /> Print
                    </button>

                    <button
                        onClick={downloadPDF}
                        className="flex items-center gap-2 bg-[#0e9a86] text-white px-4 py-1 rounded"
                    >
                        <Download size={16} /> PDF
                    </button>
                </div>
            </div>

            {/* RECEIPT */}
            <div
                ref={receiptRef}
                className="relative bg-white max-w-2xl mx-auto rounded-2xl shadow p-6 print:shadow-none overflow-hidden"
            >


                {/* HEADER */}
                <div className="relative flex items-center mb-6 z-10">
                    {/* LEFT LOGO */}
                    <img
                        src="/logo/logo.png"
                        alt="SNGR Logo"
                        className="h-20 w-auto object-contain"
                    />

                    {/* CENTER TITLE */}
                    <div className="absolute left-1/2 -translate-x-1/2 text-center">
                        <h1 className="text-2xl font-bold text-[#0e9a86]">
                            SNGR Furnitures
                        </h1>
                        <div className="text-sm text-gray-500">
                            Payment Receipt (Not a Tax Invoice)
                        </div>
                    </div>
                </div>

                <hr className="mb-4" />

                {/* META */}
                <div className="grid grid-cols-2 gap-3 text-sm mb-4 relative z-10">
                    <div>
                        <div><b>Receipt No:</b> {receipt.receiptNo}</div>
                        <div><b>Date:</b> {fmt(receipt.createdAt)}</div>
                        <div><b>Payment Mode:</b> {receipt.mode}</div>
                    </div>
                    <div className="text-right">
                        <div><b>Order ID:</b> {order._id}</div>
                    </div>
                </div>

                {/* CUSTOMER */}
                <div className="bg-[#F0FFF7] p-4 rounded-xl mb-4 relative z-10">
                    <div className="font-semibold text-[#0e9a86] mb-2">
                        Customer Details
                    </div>
                    <div className="text-sm">
                        <div><b>Name:</b> {order.customerName || "Walk-in Customer"}</div>
                        <div><b>Phone:</b> {order.customerPhone || "-"}</div>
                        <div><b>Address:</b> {order.customerAddress || "-"}</div>
                    </div>
                </div>

                {/* ITEMS */}
                <div className="mb-4 relative z-10">
                    <div className="font-semibold text-[#0e9a86] mb-2">
                        Item Details
                    </div>

                    {items.length === 0 ? (
                        <div className="text-sm text-gray-500 italic">
                            No item details available
                        </div>
                    ) : (
                        <table className="w-full text-sm border rounded overflow-hidden">
                            <thead className="bg-[#F0FFF7] text-[#0e9a86]">
                                <tr>
                                    <th className="p-2 text-left">Item Type</th>
                                    <th className="p-2 text-left">Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((d, i) => (
                                    <tr key={i} className="border-t">
                                        <td className="p-2">{d.itemType}</td>
                                        <td className="p-2">{d.name || "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* AMOUNT */}
                <div className="border rounded-xl p-4 text-center mb-4 relative z-10">
                    <div className="text-sm text-gray-500">Received Amount</div>
                    <div className="text-3xl font-bold text-[#0e9a86]">
                        ₹{receipt.amount.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        ({receipt.mode})
                    </div>
                </div>

                {/* SUMMARY */}
                <div className="grid grid-cols-2 gap-4 mb-4 relative z-10">
                    <div className="border rounded-xl p-4 text-center">
                        <div className="text-sm text-gray-500">Paid Till Now</div>
                        <div className="text-xl font-bold text-green-700">
                            ₹{(receipt.paidTillNow ?? 0).toLocaleString()}
                        </div>
                    </div>

                    <div className="border rounded-xl p-4 text-center">
                        <div className="text-sm text-gray-500">Balance Due</div>
                        <div className="text-xl font-bold text-red-600">
                            ₹{(receipt.balanceDue ?? 0).toLocaleString()}
                        </div>
                    </div>
                </div>

                <div className="flex justify-between text-xs text-gray-400 mt-8 relative z-10">
                    <div>This receipt is system generated.</div>
                    <div>Authorized Signature</div>
                </div>
            </div>
        </div>
    );
}
