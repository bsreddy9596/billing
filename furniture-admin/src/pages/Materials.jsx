// src/pages/Materials.jsx
import { useEffect, useState } from "react";
import api from "../api/api";
import { Package, PlusCircle, Pencil, Trash, X } from "lucide-react";
import socket from "../socket";
import toast from "react-hot-toast";

import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Input, Label } from "../components/ui/Input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/Table";
import Badge from "../components/ui/Badge";

export default function Materials() {
    const [materials, setMaterials] = useState([]);
    const [totalValue, setTotalValue] = useState(0);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [editData, setEditData] = useState(null);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        name: "",
        unit: "",
        costPerUnit: "",
        availableQty: "",
        quality: "",
    });

    // Fetch materials from API
    const fetchMaterials = async () => {
        setLoading(true);
        try {
            const res = await api.get("/materials");
            const list = res.data?.data || [];
            setMaterials(list);

            const total = list.reduce((sum, m) => {
                const c = Number(m.costPerUnit) || 0;
                const q = Number(m.availableQty) || 0;
                return sum + c * q;
            }, 0);
            setTotalValue(total);
        } catch (err) {
            // if 401, show friendly message and log out could be handled by interceptor
            if (err.response?.status === 401) {
                toast.error("Unauthorized. Please login again.");
            } else {
                toast.error("Failed to load materials.");
                console.error("Failed to load materials", err);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMaterials();

        // socket updates
        socket.on("material-updated", fetchMaterials);
        socket.on("material-created", fetchMaterials);
        socket.on("material-deleted", fetchMaterials);

        return () => {
            socket.off("material-updated", fetchMaterials);
            socket.off("material-created", fetchMaterials);
            socket.off("material-deleted", fetchMaterials);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Open add modal
    const handleAdd = () => {
        setEditData(null);
        setForm({
            name: "",
            unit: "",
            costPerUnit: "",
            availableQty: "",
            quality: "",
        });
        setShowModal(true);
    };

    // Open edit modal
    const handleEdit = (mat) => {
        setEditData(mat);
        setForm({
            name: mat.name || "",
            unit: mat.unit || "",
            costPerUnit: mat.costPerUnit || "",
            availableQty: mat.availableQty || "",
            quality: mat.quality || "",
        });
        setShowModal(true);
    };

    // Save (create / update)
    const handleSave = async (e) => {
        if (e && e.preventDefault) e.preventDefault();

        // Basic validation
        if (!form.name.trim()) {
            toast.error("Material name is required");
            return;
        }
        if (!form.unit.trim()) {
            toast.error("Unit is required");
            return;
        }
        if (form.costPerUnit === "" || Number(form.costPerUnit) < 0) {
            toast.error("Cost per unit must be a positive number");
            return;
        }

        setSaving(true);
        try {
            if (editData && editData._id) {
                await api.put(`/materials/${editData._id}`, {
                    name: form.name,
                    unit: form.unit,
                    costPerUnit: Number(form.costPerUnit),
                    availableQty: Number(form.availableQty) || 0,
                    quality: form.quality,
                });
                toast.success("Material updated");
            } else {
                await api.post("/materials", {
                    name: form.name,
                    unit: form.unit,
                    costPerUnit: Number(form.costPerUnit),
                    availableQty: Number(form.availableQty) || 0,
                    quality: form.quality,
                });
                toast.success("Material created");
            }

            setShowModal(false);
            fetchMaterials();
        } catch (err) {
            console.error("Error saving material:", err);
            toast.error(err.response?.data?.message || "Save failed");
        } finally {
            setSaving(false);
        }
    };

    // Delete
    const handleDelete = async (id) => {
        if (!window.confirm("Delete this material?")) return;
        try {
            await api.delete(`/materials/${id}`);
            toast.success("Deleted");
            fetchMaterials();
        } catch (err) {
            console.error("Error deleting:", err);
            toast.error("Delete failed");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Package className="text-primary-600" /> Raw Materials
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Manage raw materials & stock inventory</p>
                </div>

                <Button onClick={handleAdd} icon={PlusCircle}>
                    Add Material
                </Button>
            </div>

            {/* Total Stock Value */}
            <Card className="bg-gradient-to-br from-primary-50 to-white border-primary-100">
                <CardContent className="p-6">
                    <h2 className="text-sm font-semibold text-primary-900/70 uppercase tracking-wider">Total Stock Value</h2>
                    <p className="text-3xl font-bold text-primary-700 mt-2">₹{Number(totalValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Material Name</TableHead>
                                <TableHead>Available Qty</TableHead>
                                <TableHead>Quality</TableHead>
                                <TableHead className="text-right">Cost / Unit</TableHead>
                                <TableHead className="text-right">Total Value</TableHead>
                                <TableHead className="text-right sticky right-0 bg-slate-50/90 backdrop-blur z-20 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.02)] border-l border-slate-100">Actions</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan="6" className="h-24 text-center text-slate-500">
                                        Loading materials...
                                    </TableCell>
                                </TableRow>
                            ) : materials.length > 0 ? (
                                materials.map((mat) => (
                                    <TableRow key={mat._id} className="group">
                                        <TableCell className="font-medium text-slate-900">{mat.name}</TableCell>
                                        <TableCell>
                                            <span className="font-semibold text-slate-700">{mat.availableQty ?? 0}</span>
                                            <span className="text-slate-500 ml-1 text-xs uppercase">{mat.unit}</span>
                                        </TableCell>
                                        <TableCell>
                                            {mat.quality ? (
                                                <Badge variant="default" className="bg-slate-100 text-slate-700 border-slate-200">
                                                    {mat.quality}
                                                </Badge>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right text-slate-600">
                                            ₹{Number(mat.costPerUnit || 0).toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold text-primary-600">
                                            ₹{((Number(mat.costPerUnit) || 0) * (Number(mat.availableQty) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="text-right sticky right-0 bg-white group-hover:bg-slate-50/80 z-10 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.05)] border-l border-slate-100">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="sm" onClick={() => handleEdit(mat)} className="h-8 w-8 p-0 text-slate-400 hover:text-primary-600">
                                                    <Pencil size={16} />
                                                </Button>

                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(mat._id)} className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600">
                                                    <Trash size={16} />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan="6" className="h-32 text-center text-slate-500">
                                        No materials found. Start by adding one.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <Card className="w-full max-w-md shadow-xl animate-in zoom-in duration-200">
                        <CardHeader className="flex flex-row items-center justify-between pb-4">
                            <CardTitle>{editData ? "Edit Material" : "Add New Material"}</CardTitle>
                            <Button variant="ghost" size="sm" onClick={() => setShowModal(false)} className="h-8 w-8 p-0 rounded-full">
                                <X className="h-4 w-4" />
                            </Button>
                        </CardHeader>

                        <CardContent>
                            <form
                                onSubmit={handleSave}
                                className="space-y-4"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleSave(e);
                                    }
                                }}
                            >
                                <div>
                                    <Label>Material Name</Label>
                                    <Input
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        required
                                        placeholder="e.g. Teak Wood"
                                    />
                                </div>

                                <div>
                                    <Label>Unit of Measurement</Label>
                                    <Input
                                        value={form.unit}
                                        onChange={(e) => setForm({ ...form, unit: e.target.value })}
                                        required
                                        placeholder="e.g. sq ft, kg, piece"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Cost Per Unit (₹)</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={form.costPerUnit}
                                            onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })}
                                            required
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <div>
                                        <Label>Available Qty</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={form.availableQty}
                                            onChange={(e) => setForm({ ...form, availableQty: e.target.value })}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label>Quality / Grade (Optional)</Label>
                                    <Input
                                        value={form.quality}
                                        onChange={(e) => setForm({ ...form, quality: e.target.value })}
                                        placeholder="e.g. Premium / Grade A"
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                                    <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                                        Cancel
                                    </Button>

                                    <Button type="submit" disabled={saving}>
                                        {saving ? (editData ? "Updating..." : "Saving...") : editData ? "Update Material" : "Save Material"}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
