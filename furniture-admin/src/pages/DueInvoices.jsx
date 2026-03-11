import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/api";
import { Card, CardContent } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import Button from "../components/ui/Button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/Table";
import Badge from "../components/ui/Badge";
import { Search, FileText, AlertCircle } from "lucide-react";

const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
        <div className="space-y-6">
            {/* ================= HEADER ================= */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <AlertCircle className="text-rose-500" />
                        Due Invoices
                        {typeFilter === "order" && <span className="text-slate-500 font-normal text-lg ml-2">– Orders</span>}
                        {typeFilter === "product" && <span className="text-slate-500 font-normal text-lg ml-2">– Products</span>}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Track and manage outstanding payments</p>
                </div>
            </div>

            {/* ================= FILTERS & SUMMARY ================= */}
            <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                    <div className="relative max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white"
                            placeholder="Search name, phone, or invoice no..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <Card className="bg-rose-50 border-rose-100 flex-shrink-0 w-full lg:w-72">
                    <CardContent className="p-4 flex justify-between items-center">
                        <div>
                            <div className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Total Due Amount</div>
                            <div className="text-2xl font-bold text-rose-600 mt-1">
                                {money(totalDue)}
                            </div>
                        </div>
                        <div className="text-sm font-medium text-rose-700 bg-rose-100 px-3 py-1 rounded-full">
                            {filteredInvoices.length} {filteredInvoices.length === 1 ? 'invoice' : 'invoices'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ================= DESKTOP TABLE ================= */}
            <div className="hidden md:block">
                <Card>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Mobile</TableHead>
                                    <TableHead>Invoice</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-right">Paid</TableHead>
                                    <TableHead className="text-right">Due</TableHead>
                                    <TableHead className="text-right sticky right-0 bg-slate-50/90 backdrop-blur z-20 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.02)] border-l border-slate-100">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan="8" className="h-32 text-center text-slate-500">
                                            Loading due invoices...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredInvoices.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan="8" className="h-32 text-center text-slate-500">
                                            No due invoices found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredInvoices.map((inv) => (
                                        <TableRow key={inv._id} className="group">
                                            <TableCell>
                                                <div className="font-semibold text-slate-800">{inv.customerName}</div>
                                                <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">
                                                    {inv.customerAddress || "No address provided"}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-slate-600">{inv.customerPhone || "—"}</TableCell>
                                            <TableCell className="font-medium text-slate-700">{inv.invoiceNumber}</TableCell>
                                            <TableCell className="capitalize text-slate-600">{inv.invoiceType}</TableCell>
                                            <TableCell className="text-right font-medium text-slate-900">{money(inv.total)}</TableCell>
                                            <TableCell className="text-right font-medium text-emerald-600">
                                                {money(inv.paidAmount)}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-rose-600 bg-rose-50/50">
                                                {money(inv.dueAmount)}
                                            </TableCell>
                                            <TableCell className="text-right sticky right-0 bg-white group-hover:bg-slate-50/80 z-10 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.05)] border-l border-slate-100">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() =>
                                                        navigate(
                                                            inv.invoiceType === "order"
                                                                ? `/invoice/order/${inv._id}`
                                                                : `/invoice/product/${inv._id}`
                                                        )
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

            {/* ================= MOBILE VIEW ================= */}
            <div className="md:hidden space-y-4">
                {loading ? (
                    <div className="text-center py-8 text-slate-500">Loading...</div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 bg-white rounded-xl border border-slate-200 border-dashed">
                        No due invoices found.
                    </div>
                ) : (
                    filteredInvoices.map((inv) => (
                        <Card key={inv._id} className="overflow-hidden">
                            <CardContent className="p-0">
                                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                                    <div>
                                        <div className="font-semibold text-slate-900">{inv.customerName}</div>
                                        <div className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                                            <span>{inv.customerPhone || "No phone"}</span>
                                        </div>
                                    </div>
                                    <Badge variant="danger" className="shrink-0 text-sm py-1 px-2 shadow-sm">
                                        Due: {money(inv.dueAmount)}
                                    </Badge>
                                </div>
                                <div className="p-4 space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500">Invoice No:</span>
                                        <span className="font-medium text-slate-900">{inv.invoiceNumber}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500">Total Amount:</span>
                                        <span className="font-medium text-slate-900">{money(inv.total)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500">Paid Amount:</span>
                                        <span className="font-medium text-emerald-600">{money(inv.paidAmount)}</span>
                                    </div>
                                </div>
                                <div className="p-4 border-t border-slate-100 bg-slate-50">
                                    <Button
                                        variant="outline"
                                        className="w-full bg-white"
                                        icon={FileText}
                                        onClick={() =>
                                            navigate(
                                                inv.invoiceType === "order"
                                                    ? `/invoice/order/${inv._id}`
                                                    : `/invoice/product/${inv._id}`
                                            )
                                        }
                                    >
                                        View Invoice
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
