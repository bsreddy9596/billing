import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import toast, { Toaster } from "react-hot-toast";
import { Plus, Trash2, Printer, Save, ArrowLeft, Search, Calendar, FileText, CheckCircle2 } from "lucide-react";
import Button from "../components/ui/Button";
import { Input, Label } from "../components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";

/* ---------------- HELPERS ---------------- */
const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN");
const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function BillingForm() {
    const navigate = useNavigate();
    const invoiceRef = useRef(null);

    /* ---------------- SHOP ---------------- */
    const SHOP = {
        name: "SNGR Furnitures",
        address: "Old Bus Stand Road, Metpally",
        phone: "+91 9640044469",
        logo: "/logo/logo.png",
    };

    /* ---------------- STATE ---------------- */
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");

    const [items, setItems] = useState([
        { description: "", qty: 1, rate: 0, taxPercent: 0, unit: "pcs", productId: null },
    ]);

    const [payments, setPayments] = useState([
        { type: "payment", amount: "", date: new Date().toISOString().substring(0, 10), method: "cash" },
    ]);

    const [products, setProducts] = useState([]);
    // Product search modal states
    const [query, setQuery] = useState("");
    const [activeRow, setActiveRow] = useState(null);
    const [keyboardFocus, setKeyboardFocus] = useState(-1);

    const [saving, setSaving] = useState(false);

    const invoiceNumber = `INV-${Date.now()}`;
    const invoiceDate = new Date();

    /* ---------------- LOAD PRODUCTS ---------------- */
    useEffect(() => {
        api.get("/products").then((res) => {
            setProducts(res.data.data || []);
        });
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.autocomplete-container')) {
                setActiveRow(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    /* ---------------- ITEMS ---------------- */
    const updateItem = (i, patch) => {
        setItems((prev) =>
            prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it))
        );
    };

    const addItem = () =>
        setItems([
            ...items,
            { description: "", qty: 1, rate: 0, taxPercent: 0, unit: "pcs", productId: null },
        ]);

    const removeItem = (i) =>
        setItems(items.filter((_, idx) => idx !== i));

    /* ✅ Product select + rate auto fill */
    const applyProduct = (i, p) => {
        const rate = p.sellPrice ?? p.salePrice ?? p.price ?? 0;

        updateItem(i, {
            description: `${p.name}${p.brand ? ` (${p.brand})` : ""}`,
            rate,
            productId: p._id,
            qty: 1,
            taxPercent: p.taxPercent || 0,
            unit: p.unit || "pcs",
        });

        setActiveRow(null);
        setQuery("");
        setKeyboardFocus(-1);
    };

    const handleKeyDown = (e, index) => {
        if (activeRow !== index) return;

        const filtered = products.filter((p) =>
            `${p.name} ${p.brand || ""}`.toLowerCase().includes((query || "").toLowerCase())
        );

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setKeyboardFocus((prev) => (prev < filtered.length - 1 ? prev + 1 : prev));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setKeyboardFocus((prev) => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === "Enter" && keyboardFocus >= 0 && keyboardFocus < filtered.length) {
            e.preventDefault();
            applyProduct(index, filtered[keyboardFocus]);
        }
    };

    /* ---------------- PAYMENTS ---------------- */
    const updatePayment = (i, patch) => {
        setPayments((prev) =>
            prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p))
        );
    };

    const addPayment = () =>
        setPayments([
            ...payments,
            {
                date: new Date().toISOString().slice(0, 10),
                type: "payment",
                amount: 0,
            },
        ]);

    const removePayment = (i) =>
        setPayments(payments.filter((_, idx) => idx !== i));

    /* ---------------- TOTALS ---------------- */
    const subTotal = items.reduce(
        (s, it) => s + Number(it.qty) * Number(it.rate),
        0
    );

    const taxTotal = items.reduce(
        (s, it) => s + (Number(it.qty) * Number(it.rate) * (Number(it.taxPercent || 0) / 100)),
        0
    );

    const total = subTotal + taxTotal;

    const paid = payments.reduce(
        (s, p) => s + Number(p.amount || 0),
        0
    );

    const due = Math.max(0, total - paid);

    /* ---------------- SAVE ---------------- */
    const saveInvoice = async () => {
        if (!customerName.trim())
            return toast.error("Customer name required");

        for (const it of items) {
            if (!it.productId)
                return toast.error("Select product from suggestions for all items");
            if (it.qty <= 0) return toast.error("Quantity must be at least 1");
            if (it.rate <= 0) return toast.error("Rate must be greater than 0");
        }

        setSaving(true);
        try {
            await api.post("/invoices/product", {
                customerName,
                customerPhone,
                customerAddress,
                items: items.map((i) => ({
                    productId: i.productId,
                    qty: i.qty,
                    rate: i.rate,
                    taxPercent: i.taxPercent,
                    unit: i.unit,
                })),
                payments: payments
                    .filter((p) => p.amount > 0)
                    .map((p) => ({
                        type: p.type,
                        amount: p.amount,
                        date: p.date,
                    })),
            });

            toast.success("Invoice created successfully");
            navigate("/invoices");
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to save invoice");
        } finally {
            setSaving(false);
        }
    };

    /* ---------------- RENDER ---------------- */
    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto mb-20">
            <Toaster />
            {/* ACTION BAR */}
            <div className="flex items-center justify-between mb-6 animate-fade-in-up">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate(-1)} className="hidden sm:flex">
                        <ArrowLeft size={18} className="mr-2" /> Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Create Invoice</h1>
                        <p className="text-sm text-slate-500 mt-1">Generate a new product sale invoice.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => window.print()} className="gap-2">
                        <Printer size={16} /> <span className="hidden sm:inline">Print</span>
                    </Button>
                    <Button variant="primary" onClick={saveInvoice} disabled={saving} className="gap-2">
                        <Save size={16} /> <span className="hidden sm:inline">{saving ? "Saving..." : "Save Invoice"}</span>
                    </Button>
                </div>
            </div>

            {/* FORM / INVOICE PREVIEW CONTAINER */}
            <div
                ref={invoiceRef}
                className="bg-white rounded-2xl shadow-lg border border-slate-100 relative print:shadow-none print:border-none animate-fade-in-up md:p-8 p-4"
                style={{ animationDelay: "100ms" }}
            >
                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-6 mb-6">
                    <div className="flex gap-4 items-center mb-4 md:mb-0">
                        <div className="bg-primary/10 p-2 rounded-xl">
                            {SHOP.logo ? <img src={SHOP.logo} alt="Logo" className="w-14 h-14 object-contain" /> : <div className="w-14 h-14 flex items-center justify-center text-primary font-bold text-xl">{SHOP.name.charAt(0)}</div>}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">{SHOP.name}</h2>
                            <p className="text-sm text-slate-500 mt-1">{SHOP.address}</p>
                            <p className="text-sm font-medium text-slate-600">{SHOP.phone}</p>
                        </div>
                    </div>
                    <div className="md:text-right bg-slate-50 p-4 rounded-xl border border-slate-100 min-w-[200px]">
                        <h3 className="text-xs uppercase font-bold text-slate-400 mb-1">Invoice Details</h3>
                        <div className="flex justify-between md:justify-end gap-4 text-sm mb-1">
                            <span className="text-slate-500">Date:</span>
                            <span className="font-semibold text-slate-800">{fmtDate(invoiceDate)}</span>
                        </div>
                        <div className="flex justify-between md:justify-end gap-4 text-sm text-primary">
                            <span className="text-primary/70">Inv No:</span>
                            <span className="font-bold">{invoiceNumber}</span>
                        </div>
                    </div>
                </div>

                {/* CUSTOMER */}
                <div className="mb-8">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-6 h-px bg-slate-200"></span> Bill To <span className="w-full h-px bg-slate-100 flex-1"></span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
                        <div className="space-y-1">
                            <Label>Customer Name <span className="text-rose-500">*</span></Label>
                            <Input placeholder="E.g. Jane Smith" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Phone Number <span className="text-rose-500">*</span></Label>
                            <Input placeholder="+91 9876543210" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Address</Label>
                            <Input placeholder="Full Address..." value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
                        </div>
                    </div>
                    {/* Print-only customer info layout */}
                    <div className="hidden print:block text-sm">
                        <div className="font-bold text-lg mb-1">{customerName || "Customer Name"}</div>
                        {customerPhone && <div className="text-slate-600">{customerPhone}</div>}
                        {customerAddress && <div className="text-slate-600">{customerAddress}</div>}
                    </div>
                </div>

                {/* ITEMS */}
                <div className="mb-8">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-6 h-px bg-slate-200"></span> Products & Services <span className="w-full h-px bg-slate-100 flex-1"></span>
                    </h3>

                    <div className="border border-slate-200 rounded-xl shadow-sm">
                        <Table wrapperClassName="!overflow-visible">
                            <TableHeader className="bg-slate-50">
                                <TableRow className="hover:bg-slate-50">
                                    <TableHead className="w-[35%] text-slate-600 font-semibold py-3 h-auto">Description</TableHead>
                                    <TableHead className="w-[15%] text-center text-slate-600 font-semibold py-3 h-auto">Qty</TableHead>
                                    <TableHead className="w-[15%] text-center text-slate-600 font-semibold py-3 h-auto">Rate</TableHead>
                                    <TableHead className="w-[10%] text-center text-slate-600 font-semibold py-3 h-auto">Tax %</TableHead>
                                    <TableHead className="w-[15%] text-center text-slate-600 font-semibold py-3 h-auto">Total</TableHead>
                                    <TableHead className="w-[10%] text-center py-3 h-auto print:hidden"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((it, i) => (
                                    <TableRow key={i} className={`group print:border-b ${activeRow === i ? 'relative z-50' : 'relative z-0'}`}>
                                        <TableCell className="relative p-2 align-top autocomplete-container">
                                            <div className="print:hidden">
                                                <div className="relative">
                                                    {it.productId ? (
                                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none">
                                                            <CheckCircle2 size={16} />
                                                        </div>
                                                    ) : (
                                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                                            <Search size={16} />
                                                        </div>
                                                    )}
                                                    <Input
                                                        className={`pl-9 w-full bg-slate-50 border-transparent hover:border-slate-200 focus:bg-white focus:border-primary transition-all ${!it.productId && it.description ? 'border-amber-300 bg-amber-50' : ''}`}
                                                        placeholder="Search product..."
                                                        value={it.description}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setQuery(val);
                                                            setActiveRow(i);
                                                            setKeyboardFocus(-1);
                                                            updateItem(i, { description: val, productId: null });
                                                        }}
                                                        onFocus={() => {
                                                            setActiveRow(i);
                                                            setKeyboardFocus(-1);
                                                            setQuery(it.description || "");
                                                        }}
                                                        onKeyDown={(e) => handleKeyDown(e, i)}
                                                    />

                                                    {/* Autocomplete Dropdown */}
                                                    {activeRow === i && (
                                                        <div className="absolute left-0 top-full mt-1 w-full bg-white border border-slate-200 shadow-2xl rounded-xl z-[9999] max-h-60 overflow-y-auto custom-scrollbar">
                                                            {products
                                                                .filter((p) =>
                                                                    `${p.name} ${p.brand || ""}`
                                                                        .toLowerCase()
                                                                        .includes((query || "").toLowerCase())
                                                                )
                                                                .map((p, idx) => (
                                                                    <button
                                                                        key={p._id}
                                                                        type="button"
                                                                        onClick={() => applyProduct(i, p)}
                                                                        onMouseEnter={() => setKeyboardFocus(idx)}
                                                                        className={`w-full text-left p-3 border-b border-slate-50 last:border-0 focus:outline-none transition-colors ${keyboardFocus === idx ? 'bg-primary/5' : 'hover:bg-slate-50'}`}
                                                                    >
                                                                        <div className="font-medium text-slate-800">
                                                                            {p.name} {p.brand && <span className="text-slate-500 font-normal text-sm">({p.brand})</span>}
                                                                        </div>
                                                                        <div className="flex justify-between items-center mt-1">
                                                                            <span className="text-xs font-semibold text-emerald-600">
                                                                                ₹{p.sellPrice ?? p.salePrice ?? p.price ?? 0}
                                                                            </span>
                                                                            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                                                                Stock: {p.stockQty}
                                                                            </span>
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            {products.filter((p) => `${p.name} ${p.brand || ""}`.toLowerCase().includes((query || "").toLowerCase())).length === 0 && (
                                                                <div className="p-4 text-center text-sm text-slate-500">No products found</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {!it.productId && it.description && activeRow !== i && (
                                                    <div className="text-[10px] text-amber-600 mt-1 ml-1 leading-tight">Must select from dropdown</div>
                                                )}
                                            </div>
                                            <div className="hidden print:block py-2 font-medium">
                                                {it.description || "-"}
                                            </div>
                                        </TableCell>

                                        <TableCell className="p-2 align-top">
                                            <div className="print:hidden">
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    className="w-full text-center bg-slate-50 border-transparent hover:border-slate-200 focus:bg-white"
                                                    value={it.qty}
                                                    onChange={(e) => updateItem(i, { qty: Number(e.target.value) })}
                                                />
                                            </div>
                                            <div className="hidden print:block text-center py-2">
                                                {it.qty}
                                            </div>
                                        </TableCell>

                                        <TableCell className="p-2 align-top">
                                            <div className="print:hidden">
                                                <Input
                                                    type="number"
                                                    className="w-full text-center bg-slate-50 border-transparent hover:border-slate-200 focus:bg-white"
                                                    value={it.rate}
                                                    onChange={(e) => updateItem(i, { rate: Number(e.target.value) })}
                                                />
                                            </div>
                                            <div className="hidden print:block text-center py-2">
                                                {money(it.rate)}
                                            </div>
                                        </TableCell>

                                        <TableCell className="p-2 align-top">
                                            <div className="print:hidden relative">
                                                <Input
                                                    type="number"
                                                    className="w-full text-center bg-slate-50 border-transparent hover:border-slate-200 focus:bg-white pr-4"
                                                    value={it.taxPercent}
                                                    onChange={(e) => updateItem(i, { taxPercent: Number(e.target.value) })}
                                                />
                                            </div>
                                            <div className="hidden print:block text-center py-2">
                                                {it.taxPercent}%
                                            </div>
                                        </TableCell>

                                        <TableCell className="p-2 align-top text-center py-4 font-semibold text-slate-700">
                                            {money((it.qty * it.rate) * (1 + (it.taxPercent || 0) / 100))}
                                        </TableCell>

                                        <TableCell className="p-2 align-top text-center print:hidden pt-4">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeItem(i)}
                                                className="h-8 w-8 p-0 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors mx-auto"
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="mt-3 print:hidden px-1">
                        <Button variant="ghost" size="sm" onClick={addItem} className="text-primary hover:text-primary-700 hover:bg-primary/5 font-medium">
                            <Plus size={16} className="mr-1" /> Add Product Item
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8 mt-10">
                    {/* PAYMENTS */}
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span className="w-6 h-px bg-slate-200"></span> Payment Log <span className="w-full h-px bg-slate-100 flex-1 print:hidden"></span>
                        </h3>

                        <div className="space-y-3 print:hidden">
                            <div className="grid grid-cols-12 gap-3 mb-2 px-3 text-xs font-semibold uppercase text-slate-500 hidden sm:grid">
                                <div className="col-span-4">Date</div>
                                <div className="col-span-3">Type</div>
                                <div className="col-span-4">Amount</div>
                                <div className="col-span-1"></div>
                            </div>
                            {payments.map((p, i) => (
                                <div key={i} className="flex flex-col sm:grid sm:grid-cols-12 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 sm:items-center">
                                    <div className="sm:col-span-4">
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Calendar size={14} className="text-slate-400" />
                                            </div>
                                            <Input
                                                type="date"
                                                className="pl-9 h-10 w-full bg-white"
                                                value={p.date}
                                                onChange={(e) => updatePayment(i, { date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="sm:col-span-3">
                                        <select
                                            className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                                            value={p.type}
                                            onChange={(e) => updatePayment(i, { type: e.target.value })}
                                        >
                                            <option value="advance">Advance</option>
                                            <option value="payment">Payment</option>
                                        </select>
                                    </div>
                                    <div className="sm:col-span-4 relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                                        <Input
                                            type="number"
                                            className="pl-7 h-10 w-full bg-white"
                                            placeholder="0.00"
                                            value={p.amount === 0 ? '' : p.amount}
                                            onChange={(e) => updatePayment(i, { amount: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="sm:col-span-1 flex justify-end sm:justify-center">
                                        <Button
                                            variant="ghost"
                                            onClick={() => removePayment(i)}
                                            className="h-10 w-10 p-0 text-slate-400 hover:text-rose-500 hover:bg-rose-50 flex-shrink-0"
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            <div className="px-1 mt-2">
                                <Button variant="ghost" size="sm" onClick={addPayment} className="text-primary hover:text-primary-700 hover:bg-primary/5 font-medium">
                                    <Plus size={16} className="mr-1" /> Add Payment
                                </Button>
                            </div>
                        </div>

                        {/* Print Only Payments View */}
                        <div className="hidden print:block">
                            {payments.filter(p => p.amount > 0).map((p, i) => (
                                <div key={i} className="flex justify-between border-b border-slate-100 py-1 text-sm">
                                    <span className="text-slate-600">{fmtDate(p.date)} - {p.type === 'advance' ? 'Advance' : 'Payment'}</span>
                                    <span className="font-medium text-emerald-600">{money(p.amount)}</span>
                                </div>
                            ))}
                            {payments.filter(p => p.amount > 0).length === 0 && <span className="text-slate-400 italic text-sm">No payments recorded.</span>}
                        </div>
                    </div>

                    {/* TOTALS SUMMARY */}
                    <div className="w-full md:w-[350px]">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 h-full flex flex-col justify-center shadow-inner">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-slate-600 mb-2">
                                    <span className="font-medium">Subtotal</span>
                                    <span className="font-semibold text-slate-800 text-lg">{money(subTotal)}</span>
                                </div>
                                {taxTotal > 0 && (
                                    <div className="flex justify-between items-center text-slate-600 mb-2">
                                        <span className="font-medium">Total Tax</span>
                                        <span className="font-semibold text-slate-800 text-lg">{money(taxTotal)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-emerald-600">
                                    <span className="font-medium flex items-center gap-1">Total Paid</span>
                                    <span className="font-semibold text-lg">-{money(paid)}</span>
                                </div>

                                <div className="pt-4 border-t border-slate-200 border-dashed">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Balance Due</span>
                                        <span className={`text-3xl lg:text-4xl font-bold tracking-tight ${due > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                                            {money(due)}
                                        </span>
                                    </div>
                                    {due <= 0 && total > 0 && (
                                        <div className="mt-3">
                                            <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 font-semibold px-3 py-1.5 rounded-md text-sm uppercase tracking-wide">
                                                <CheckCircle2 size={16} /> Fully Paid
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Print Footer */}
                <div className="hidden print:block mt-16 pt-8 border-t-2 border-slate-200">
                    <div className="flex justify-between text-sm">
                        <div className="text-center w-1/3">
                            <div className="h-16 border-b border-slate-300 w-32 mx-auto mb-2 relative"></div>
                            <span className="text-slate-500 font-medium">Customer Signature</span>
                        </div>
                        <div className="text-center w-1/3 mt-6 text-slate-400 font-medium italic">
                            Thank you for your business!
                        </div>
                        <div className="text-center w-1/3">
                            <div className="h-16 border-b border-slate-300 w-32 mx-auto mb-2 relative"></div>
                            <span className="text-slate-500 font-medium">Authorized Signatory</span>
                            <div className="font-bold text-xs mt-1 text-slate-800">{SHOP.name}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Action Button for mobile */}
            <div className="fixed bottom-6 right-6 md:hidden z-40 print:hidden">
                <Button variant="primary" size="lg" onClick={saveInvoice} disabled={saving} className="rounded-full shadow-xl shadow-primary/30 h-14 px-6">
                    <Save size={20} className="mr-2" /> {saving ? "Saving..." : "Save Invoice"}
                </Button>
            </div>
        </div>
    );
}
