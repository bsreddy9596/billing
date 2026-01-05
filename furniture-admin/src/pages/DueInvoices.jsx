import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/api";

const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

export default function DueInvoices() {
    const navigate = useNavigate();
    const location = useLocation();

    const [invoices, setInvoices] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    // 🔹 read query param (?type=order | product)
    const typeFilter = new URLSearchParams(location.search).get("type");

    /* ================= LOAD DUE INVOICES ================= */
    useEffect(() => {
        const loadDueInvoices = async () => {
            try {
                const res = await api.get("/invoices/due");
                setInvoices(res.data?.data || []);
            } catch (err) {
                console.error("Failed to load due invoices", err);
            } finally {
                setLoading(false);
            }
        };

        loadDueInvoices();
    }, []);

    /* ================= FILTER (TYPE + SEARCH) ================= */
    const filteredInvoices = useMemo(() => {
        let list = invoices;

        // 🔹 TYPE FILTER (from dashboard cards)
        if (typeFilter) {
            list = list.filter((inv) => inv.invoiceType === typeFilter);
        }

        // 🔹 SEARCH FILTER
        const q = search.toLowerCase().trim();
        if (!q) return list;

        return list.filter((inv) => {
            return (
                inv.customerName?.toLowerCase().includes(q) ||
                inv.customerPhone?.toLowerCase().includes(q) ||
                inv.invoiceNumber?.toLowerCase().includes(q)
            );
        });
    }, [search, invoices, typeFilter]);

    /* ================= TOTAL DUE ================= */
    const totalDue = useMemo(() => {
        return filteredInvoices.reduce(
            (sum, inv) => sum + Number(inv.dueAmount || 0),
            0
        );
    }, [filteredInvoices]);

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">

            {/* ================= HEADER ================= */}
            <div className="mb-4 space-y-3">
                <h1 className="text-xl md:text-2xl font-bold">
                    Due Invoices
                    {typeFilter === "order" && " – Orders"}
                    {typeFilter === "product" && " – Products"}
                </h1>

                <input
                    type="text"
                    placeholder="Search name / phone / invoice no..."
                    className="border px-3 py-2 rounded w-full md:w-96 text-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* ================= SUMMARY ================= */}
            <div className="mb-5 bg-white rounded-xl shadow p-4 flex justify-between items-center">
                <div>
                    <div className="text-sm text-gray-500">Total Due Amount</div>
                    <div className="text-2xl font-bold text-red-600">
                        {money(totalDue)}
                    </div>
                </div>

                <div className="text-sm text-gray-500">
                    {filteredInvoices.length} invoices
                </div>
            </div>

            {/* ================= DESKTOP TABLE ================= */}
            <div className="hidden md:block bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 text-left">Customer</th>
                            <th className="p-3">Mobile</th>
                            <th className="p-3">Invoice</th>
                            <th className="p-3">Type</th>
                            <th className="p-3 text-right">Total</th>
                            <th className="p-3 text-right">Paid</th>
                            <th className="p-3 text-right">Due</th>
                            <th className="p-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!loading &&
                            filteredInvoices.map((inv) => (
                                <tr key={inv._id} className="border-t">
                                    <td className="p-3">
                                        <div className="font-medium">{inv.customerName}</div>
                                        <div className="text-xs text-gray-500">
                                            {inv.customerAddress || "-"}
                                        </div>
                                    </td>
                                    <td className="p-3">{inv.customerPhone || "-"}</td>
                                    <td className="p-3">{inv.invoiceNumber}</td>
                                    <td className="p-3 capitalize">{inv.invoiceType}</td>
                                    <td className="p-3 text-right">{money(inv.total)}</td>
                                    <td className="p-3 text-right text-green-600">
                                        {money(inv.paidAmount)}
                                    </td>
                                    <td className="p-3 text-right text-red-600 font-semibold">
                                        {money(inv.dueAmount)}
                                    </td>
                                    <td className="p-3 text-right">
                                        <button
                                            onClick={() =>
                                                navigate(
                                                    inv.invoiceType === "order"
                                                        ? `/invoice/order/${inv._id}`
                                                        : `/invoice/product/${inv._id}`
                                                )
                                            }
                                            className="text-[#0e9a86] hover:underline"
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}

                        {!loading && filteredInvoices.length === 0 && (
                            <tr>
                                <td colSpan="8" className="p-6 text-center text-gray-400">
                                    No due invoices found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* ================= MOBILE VIEW ================= */}
            <div className="md:hidden space-y-3">
                {filteredInvoices.map((inv) => (
                    <div
                        key={inv._id}
                        className="bg-white rounded-xl shadow p-4 space-y-2"
                    >
                        <div className="flex justify-between">
                            <div className="font-semibold">{inv.customerName}</div>
                            <div className="text-red-600 font-bold">
                                {money(inv.dueAmount)}
                            </div>
                        </div>

                        <div className="text-sm text-gray-500">
                            {inv.customerPhone || "-"}
                        </div>

                        <div className="text-sm">
                            Invoice: <b>{inv.invoiceNumber}</b>
                        </div>

                        <div className="flex justify-between text-sm">
                            <span>Total: {money(inv.total)}</span>
                            <span className="text-green-600">
                                Paid: {money(inv.paidAmount)}
                            </span>
                        </div>

                        <button
                            onClick={() =>
                                navigate(
                                    inv.invoiceType === "order"
                                        ? `/invoice/order/${inv._id}`
                                        : `/invoice/product/${inv._id}`
                                )
                            }
                            className="mt-2 w-full border rounded py-2 text-[#0e9a86]"
                        >
                            View Invoice
                        </button>
                    </div>
                ))}

                {!loading && filteredInvoices.length === 0 && (
                    <div className="text-center text-gray-400 py-6">
                        No due invoices found
                    </div>
                )}
            </div>
        </div>
    );
}
