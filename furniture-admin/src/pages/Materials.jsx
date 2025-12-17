// src/pages/Materials.jsx
import { useEffect, useState } from "react";
import api from "../api/api";
import { Package, PlusCircle, Pencil, Trash, X } from "lucide-react";
import socket from "../socket";
import toast from "react-hot-toast";

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
        <div className="p-6 space-y-6 bg-gradient-to-br from-white via-[#F0FFFB] to-[#E6FFF8] min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <Package className="text-[#00BFA6]" />
                    <div>
                        <h1 className="text-2xl font-extrabold text-gray-900">Raw Materials</h1>
                        <p className="text-sm text-gray-500">Manage raw materials & stock</p>
                    </div>
                </div>

                <div className="w-full sm:w-auto flex gap-2">
                    <button
                        onClick={handleAdd}
                        className="flex items-center gap-2 bg-gradient-to-r from-[#00BFA6] to-[#00A28E] text-white px-4 py-2 rounded-lg shadow hover:opacity-95 transition"
                    >
                        <PlusCircle size={18} /> Add Material
                    </button>
                </div>
            </div>

            {/* Total Stock Value */}
            <div className="bg-white p-5 rounded-2xl shadow-md border border-gray-100">
                <h2 className="text-lg font-semibold text-gray-700">Total Stock Value</h2>
                <p className="text-3xl font-bold text-[#00BFA6] mt-1">₹{Number(totalValue || 0).toLocaleString()}</p>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-x-auto">
                <table className="min-w-full text-sm text-gray-700">
                    <thead className="bg-[#E0FFF5] text-gray-700 text-xs uppercase font-semibold border-b">
                        <tr>
                            <th className="p-3 text-left">Material</th>
                            <th className="p-3 text-left">Available Qty</th>
                            <th className="p-3 text-left">Quality</th>
                            <th className="p-3 text-left">Cost / Unit (₹)</th>
                            <th className="p-3 text-left">Total Value (₹)</th>
                            <th className="p-3 text-center">Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="6" className="p-6 text-center text-gray-500">
                                    Loading materials...
                                </td>
                            </tr>
                        ) : materials.length > 0 ? (
                            materials.map((mat) => (
                                <tr key={mat._id} className="border-b hover:bg-[#F0FFFB] transition">
                                    <td className="p-3 font-medium">{mat.name}</td>
                                    <td className="p-3">
                                        {mat.availableQty ?? 0} {mat.unit}
                                    </td>
                                    <td className="p-3">{mat.quality || "—"}</td>
                                    <td className="p-3">{Number(mat.costPerUnit || 0).toFixed(2)}</td>
                                    <td className="p-3 font-semibold text-[#00BFA6]">
                                        ₹{((Number(mat.costPerUnit) || 0) * (Number(mat.availableQty) || 0)).toLocaleString()}
                                    </td>
                                    <td className="p-3">
                                        <div className="flex justify-center gap-3">
                                            <button onClick={() => handleEdit(mat)} className="text-[#00BFA6] hover:text-[#008F7A]">
                                                <Pencil size={16} />
                                            </button>

                                            <button onClick={() => handleDelete(mat._id)} className="text-red-500 hover:text-red-700">
                                                <Trash size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="text-center py-6 text-gray-500 italic">
                                    No materials found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-[#00BFA6]"
                            aria-label="Close"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-2xl font-semibold text-gray-800 mb-5 text-center">
                            {editData ? "Edit Material" : "Add New Material"}
                        </h2>

                        <form
                            onSubmit={handleSave}
                            className="space-y-4"
                            onKeyDown={(e) => {
                                // Enter key should submit/save inside modal
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleSave(e);
                                }
                            }}
                        >
                            <div>
                                <label className="text-sm block mb-1">Material Name</label>
                                <input
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                    className="w-full border rounded-md px-3 py-2"
                                />
                            </div>

                            <div>
                                <label className="text-sm block mb-1">Unit</label>
                                <input
                                    value={form.unit}
                                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                                    required
                                    className="w-full border rounded-md px-3 py-2"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm block mb-1">Cost Per Unit</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.costPerUnit}
                                        onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })}
                                        required
                                        className="w-full border rounded-md px-3 py-2"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm block mb-1">Available Qty</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={form.availableQty}
                                        onChange={(e) => setForm({ ...form, availableQty: e.target.value })}
                                        className="w-full border rounded-md px-3 py-2"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm block mb-1">Quality</label>
                                <input
                                    value={form.quality}
                                    onChange={(e) => setForm({ ...form, quality: e.target.value })}
                                    placeholder="A / B / Premium"
                                    className="w-full border rounded-md px-3 py-2"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-200 rounded-md">
                                    Cancel
                                </button>

                                <button type="submit" disabled={saving} className="px-5 py-2 bg-[#00BFA6] text-white rounded-md">
                                    {saving ? (editData ? "Updating..." : "Saving...") : editData ? "Update" : "Save"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
