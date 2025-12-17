// src/pages/Materials/MaterialList.jsx
import React, { useEffect, useState } from "react";
import api from "../../api/api";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";

export default function MaterialList() {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);

    // Add/Edit Modal
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    // Form fields
    const [name, setName] = useState("");
    const [quality, setQuality] = useState("");
    const [unit, setUnit] = useState("pcs");
    const [qty, setQty] = useState("");

    const user = JSON.parse(localStorage.getItem("employeeUser") || "{}");
    const role = user.role || "employee"; // default employee

    useEffect(() => {
        fetchMaterials();
    }, []);

    const fetchMaterials = async () => {
        try {
            setLoading(true);
            const res = await api.get("/materials");
            setMaterials(res.data.data || []);
        } catch (err) {
            console.log("Failed to load materials");
        } finally {
            setLoading(false);
        }
    };

    /* ---------------------- OPEN ADD MATERIAL ---------------------- */
    const openAddModal = () => {
        setEditMode(false);
        setCurrentId(null);
        setName("");
        setQuality("");
        setUnit("pcs");
        setQty("");
        setShowModal(true);
    };

    /* ---------------------- OPEN EDIT MATERIAL ---------------------- */
    const openEditModal = (mat) => {
        setEditMode(true);
        setCurrentId(mat._id);
        setName(mat.name);
        setQuality(mat.quality);
        setUnit(mat.unit);
        setQty(mat.availableQty);
        setShowModal(true);
    };

    /* ---------------------- SAVE MATERIAL (ADMIN/EMPLOYEE) ---------------------- */
    const saveMaterial = async () => {
        if (!name.trim()) return toast.error("Enter material name");
        if (!quality.trim()) return toast.error("Enter quality (12mm, 18mm etc.)");
        if (!qty || qty <= 0) return toast.error("Enter valid quantity");

        try {
            await api.post("/materials", {
                name,
                quality,
                unit,
                availableQty: qty,
                minThreshold: 5
            });

            toast.success("Material added!");
            setShowModal(false);
            fetchMaterials();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to save material");
        }
    };

    /* ---------------------- UPDATE MATERIAL (ADMIN/EMPLOYEE) ---------------------- */
    const updateMaterial = async () => {
        try {
            await api.put(`/materials/${currentId}/add-stock`, {
                qty: qty - materials.find(m => m._id === currentId).availableQty,
            });

            // also update fields (name, quality, unit)
            await api.put(`/products/update-material-basic/${currentId}`, {
                name,
                quality,
                unit
            });

            toast.success("Material updated!");
            setShowModal(false);
            fetchMaterials();

        } catch (err) {
            toast.error("Failed to update material");
        }
    };

    /* ---------------------- DELETE MATERIAL (ADMIN ONLY) ---------------------- */
    const deleteMaterial = async (id) => {
        if (!window.confirm("Delete this material?")) return;

        try {
            await api.delete(`/materials/${id}`);
            toast.success("Material deleted");
            fetchMaterials();
        } catch (err) {
            toast.error("Delete failed");
        }
    };

    return (
        <div className="p-6">

            {/* Header Row */}
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Materials</h1>

                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 bg-[#00BFA6] text-white px-4 py-2 rounded-lg hover:bg-[#009e8a]"
                >
                    <Plus size={18} />
                    Add Material
                </button>
            </div>

            {/* Table View */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 text-left">Name</th>
                            <th className="p-3 text-left">Quality</th>
                            <th className="p-3 text-left">Unit</th>
                            <th className="p-3 text-left">Quantity</th>

                            {/* Show threshold only to admin */}
                            {role === "admin" && (
                                <th className="p-3 text-left">Min Threshold</th>
                            )}

                            {/* Show price only to admin */}
                            {role === "admin" && (
                                <>
                                    <th className="p-3 text-left">Price/Unit</th>
                                    <th className="p-3 text-left">Total Value</th>
                                </>
                            )}

                            <th className="p-3 text-center">Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {materials.map((m) => (
                            <tr key={m._id} className="border-b hover:bg-gray-50">
                                <td className="p-3">{m.name}</td>
                                <td className="p-3">{m.quality}</td>
                                <td className="p-3">{m.unit}</td>
                                <td className="p-3">{m.availableQty}</td>

                                {role === "admin" && (
                                    <td className="p-3">{m.minThreshold}</td>
                                )}

                                {role === "admin" && (
                                    <>
                                        <td className="p-3">₹{m.costPerUnit}</td>
                                        <td className="p-3 font-semibold">
                                            ₹{m.availableQty * m.costPerUnit}
                                        </td>
                                    </>
                                )}

                                <td className="p-3 text-center flex justify-center gap-3">
                                    <button
                                        className="text-blue-600"
                                        onClick={() => openEditModal(m)}
                                    >
                                        <Pencil size={18} />
                                    </button>

                                    {role === "admin" && (
                                        <button
                                            className="text-red-600"
                                            onClick={() => deleteMaterial(m._id)}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ---------------------- ADD / EDIT MODAL ---------------------- */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 shadow-xl w-[90%] max-w-lg relative">

                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                        >
                            <X size={22} />
                        </button>

                        <h2 className="text-xl font-semibold mb-4">
                            {editMode ? "Edit Material" : "Add New Material"}
                        </h2>

                        <div className="space-y-4">

                            <div>
                                <label className="text-sm">Material Name</label>
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="border p-2 w-full rounded mt-1"
                                />
                            </div>

                            <div>
                                <label className="text-sm">Quality</label>
                                <input
                                    value={quality}
                                    onChange={(e) => setQuality(e.target.value)}
                                    className="border p-2 w-full rounded mt-1"
                                    placeholder="12mm, 18mm, Waterproof..."
                                />
                            </div>

                            <div>
                                <label className="text-sm">Unit</label>
                                <input
                                    value={unit}
                                    onChange={(e) => setUnit(e.target.value)}
                                    className="border p-2 w-full rounded mt-1"
                                    placeholder="pcs, kg, meter..."
                                />
                            </div>

                            <div>
                                <label className="text-sm">Quantity</label>
                                <input
                                    type="number"
                                    value={qty}
                                    onChange={(e) => setQty(e.target.value)}
                                    className="border p-2 w-full rounded mt-1"
                                />
                            </div>

                        </div>

                        <div className="flex justify-end gap-3 mt-5">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 border rounded-lg"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={editMode ? updateMaterial : saveMaterial}
                                className="px-4 py-2 bg-[#00BFA6] text-white rounded-lg hover:bg-[#009e8a]"
                            >
                                {editMode ? "Update" : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
