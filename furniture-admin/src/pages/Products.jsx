import { useEffect, useState } from "react";
import api from "../api/api";
import { Plus, X, Upload, Pencil, Trash2, Search, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Input, Label } from "../components/ui/Input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/Table";
import Badge from "../components/ui/Badge";

const PLACEHOLDER =
    "https://via.placeholder.com/80x60.png?text=Product";

export default function Products() {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const [form, setForm] = useState({
        name: "",
        brand: "",
        qty: "",
        buyPrice: "",
        sellPrice: "",
        image: null,
        preview: "",
    });

    /* ================= FETCH ================= */
    const fetchProducts = async () => {
        const res = await api.get("/products");
        setProducts(res.data.data || []);
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    /* ================= IMAGE ================= */
    const handleImage = (file) => {
        if (!file) return;
        setForm({
            ...form,
            image: file,
            preview: URL.createObjectURL(file),
        });
    };

    /* ================= SAVE ================= */
    const handleSave = async () => {
        if (!form.name || !form.sellPrice) {
            alert("Name & Sell price required");
            return;
        }

        const fd = new FormData();
        fd.append("name", form.name);
        fd.append("brand", form.brand);
        fd.append("stockQty", form.qty);
        fd.append("buyPrice", form.buyPrice);
        fd.append("sellPrice", form.sellPrice);
        if (form.image) fd.append("image", form.image);

        if (editing) {
            await api.put(`/products/${editing._id}`, fd);
        } else {
            await api.post("/products", fd);
        }

        resetModal();
        fetchProducts();
    };

    /* ================= DELETE ================= */
    const handleDelete = async (id) => {
        if (!window.confirm("Delete this product?")) return;
        await api.delete(`/products/${id}`);
        fetchProducts();
    };

    /* ================= EDIT ================= */
    const handleEdit = (p) => {
        setEditing(p);
        setForm({
            name: p.name,
            brand: p.brand || "",
            qty: p.stockQty || "",
            buyPrice: p.buyPrice || "",
            sellPrice: p.sellPrice || "",
            image: null,
            preview: p.image || "",
        });
        setOpen(true);
    };

    const resetModal = () => {
        setOpen(false);
        setEditing(null);
        setForm({
            name: "",
            brand: "",
            qty: "",
            buyPrice: "",
            sellPrice: "",
            image: null,
            preview: "",
        });
    };

    const filtered = products.filter((p) =>
        p.name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Products Inventory</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage your store's items, pricing, and stock.</p>
                </div>

                <Button onClick={() => setOpen(true)} icon={Plus}>
                    Add Product
                </Button>
            </div>

            {/* SEARCH & FILTERS */}
            <Card>
                <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search products by name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* TABLE */}
            <Card>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">Image</TableHead>
                                <TableHead>Product Details</TableHead>
                                <TableHead className="text-center">Stock Info</TableHead>
                                <TableHead className="text-right">Buy Price</TableHead>
                                <TableHead className="text-right">Sell Price</TableHead>
                                <TableHead className="text-right sticky right-0 bg-slate-50/90 backdrop-blur z-20 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.02)] border-l border-slate-100">Actions</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {filtered.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                                        No products found matching your search.
                                    </TableCell>
                                </TableRow>
                            )}

                            {filtered.map((p) => (
                                <TableRow key={p._id} className={p.stockQty <= 3 ? "bg-rose-50/50" : ""}>
                                    <TableCell>
                                        <div className="h-16 w-16 rounded-lg overflow-hidden border border-slate-200 bg-white">
                                            <img
                                                src={p.image || PLACEHOLDER}
                                                alt={p.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-semibold text-slate-900">{p.name}</div>
                                        <div className="text-sm text-slate-500">{p.brand || "Generic"}</div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className={`font-semibold text-lg ${p.stockQty <= 3 ? "text-rose-600" : "text-slate-700"}`}>
                                            {p.stockQty || 0}
                                        </div>
                                        {p.stockQty <= 3 && (
                                            <Badge variant="danger" className="mt-1">
                                                Low Stock
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-slate-600">
                                        {p.buyPrice ? `₹${p.buyPrice.toLocaleString()}` : "—"}
                                    </TableCell>
                                    <TableCell className="text-right text-base font-bold text-slate-900">
                                        ₹{p.sellPrice.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right space-x-2 sticky right-0 bg-white group-hover:bg-slate-50/80 z-10 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.05)] border-l border-slate-100">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEdit(p)}
                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                            icon={Pencil}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(p._id)}
                                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                            icon={Trash2}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* MODAL */}
            {open && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-lg shadow-xl outline-none" role="dialog" aria-modal="true">
                        <CardHeader className="flex flex-row items-center justify-between pb-4">
                            <CardTitle>{editing ? "Edit Product" : "Add New Product"}</CardTitle>
                            <Button variant="ghost" size="sm" onClick={resetModal} className="h-8 w-8 p-0 rounded-full">
                                <X className="h-4 w-4" />
                            </Button>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            {/* IMAGE */}
                            <div>
                                <Label>Product Image</Label>
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors overflow-hidden">
                                    {form.preview ? (
                                        <img
                                            src={form.preview}
                                            alt="Preview"
                                            className="h-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-slate-500">
                                            <Upload className="w-6 h-6 mb-2" />
                                            <p className="text-sm font-medium">Click to upload image</p>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleImage(e.target.files[0])}
                                    />
                                </label>
                            </div>

                            {/* INPUTS */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <Label>Product Name</Label>
                                    <Input
                                        placeholder="e.g. Wooden Dining Table"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>Brand</Label>
                                    <Input
                                        placeholder="e.g. IKEA"
                                        value={form.brand}
                                        onChange={(e) => setForm({ ...form, brand: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>Initial Stock Qty</Label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={form.qty}
                                        onChange={(e) => setForm({ ...form, qty: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>Buy Price (₹)</Label>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        value={form.buyPrice}
                                        onChange={(e) => setForm({ ...form, buyPrice: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>Sell Price (₹)</Label>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        value={form.sellPrice}
                                        onChange={(e) => setForm({ ...form, sellPrice: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                                <Button variant="secondary" onClick={resetModal}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSave}>
                                    {editing ? "Save Changes" : "Add Product"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
