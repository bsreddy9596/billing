// src/pages/Orders/CreateOrder.jsx
import React, { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";

import api from "../../api/api";
import { Plus, Trash, Image as ImageIcon, Save } from "lucide-react";

const newDrawing = () => ({
    itemType: "SOFA",
    name: "",
    notes: "",
    drawingUrl: "",
    materials: [],
    measurements: {},
});

function Input({ label, value, onChange, type = "text" }) {
    return (
        <div className="w-full">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2"
            />
        </div>
    );
}

function Select({ label, value, options, onChange }) {
    return (
        <div className="w-full">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="mt-1 w-full border rounded-lg px-3 py-2"
            >
                {options.map((o) => (
                    <option key={o} value={o}>
                        {String(o)}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default function CreateOrder() {
    const navigate = useNavigate();
    const [params] = useSearchParams();

    const editId = params.get("edit"); // ⭐ Check if editing

    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const [drawings, setDrawings] = useState([newDrawing()]);
    const [saving, setSaving] = useState(false);

    /* ---------------------------------------------------------------------- */
    /* ⭐ LOAD OLD ORDER WHEN IN EDIT MODE                                     */
    /* ---------------------------------------------------------------------- */
    useEffect(() => {
        if (!editId) return;

        const loadOrder = async () => {
            try {
                const res = await api.get(`/orders/single/${editId}`);
                const o = res.data.data;

                setCustomerName(o.customerName || "");
                setCustomerPhone(o.customerPhone || "");
                setCustomerAddress(o.customerAddress || "");

                if (o.drawings?.length > 0) {
                    setDrawings(
                        o.drawings.map((d) => ({
                            itemType: d.itemType,
                            name: d.name,
                            notes: d.notes || "",
                            drawingUrl: d.drawingUrl || "",
                            measurements: d.measurements || {},
                            materials: d.materials || [],
                        }))
                    );
                }
            } catch (err) {
                console.error(err);
                toast.error("Failed to load order");
            }
        };

        loadOrder();
    }, [editId]);

    /* ---------------------------------------------------------------------- */
    /* DRAWINGS HANDLERS                                                      */
    /* ---------------------------------------------------------------------- */
    const addDrawing = () => setDrawings([...drawings, newDrawing()]);
    const removeDrawing = (i) => setDrawings(drawings.filter((_, idx) => idx !== i));

    const updateDrawing = (i, key, value) => {
        const list = [...drawings];
        list[i] = { ...list[i], [key]: value };
        setDrawings(list);
    };

    const uploadImage = async (i, file) => {
        if (!file) return;
        try {
            const data = new FormData();
            data.append("file", file);

            const res = await api.post("/upload", data);
            let url = res.data.url;

            if (!url.startsWith("http")) {
                const base = import.meta.env.VITE_API_URL?.replace("/api", "") || "";
                url = base + url;
            }

            updateDrawing(i, "drawingUrl", url);
            toast.success("Image uploaded");
        } catch (err) {
            console.error(err);
            toast.error("Upload failed");
        }
    };

    /* ---------------------------------------------------------------------- */
    /* ⭐ SAVE ORDER → CREATE OR UPDATE                                         */
    /* ---------------------------------------------------------------------- */
    const saveOrder = async () => {
        if (!customerName.trim()) return toast.error("Customer name required");
        if (!drawings[0].name.trim()) return toast.error("First drawing name required");

        setSaving(true);

        const payload = {
            customerName,
            customerPhone,
            customerAddress,
            drawings: drawings.map((d) => ({
                itemType: d.itemType,
                name: d.name,
                notes: d.notes,
                drawingUrl: d.drawingUrl,
                measurements: d.measurements,
                materials: d.materials,
            })),
        };

        try {
            if (editId) {
                // ⭐ UPDATE MODE
                await api.put(`/orders/${editId}`, payload);
                toast.success("Order updated successfully!");
            } else {
                // ⭐ CREATE MODE
                await api.post("/orders", payload);
                toast.success("Order created successfully!");
            }

            navigate("/orders");

        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Save failed");
        } finally {
            setSaving(false);
        }
    };

    /* ---------------------------------------------------------------------- */

    return (
        <div className="p-4 md:p-6">
            <Toaster />
            <h1 className="text-2xl font-bold mb-6">
                {editId ? "Edit Order" : "Create Order"}
            </h1>

            <div className="bg-white p-5 rounded-xl border shadow-md space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Input label="Customer Name" value={customerName} onChange={setCustomerName} />
                    <Input label="Phone Number" value={customerPhone} onChange={setCustomerPhone} />
                    <Input label="Address" value={customerAddress} onChange={setCustomerAddress} />
                </div>

                {drawings.map((d, idx) => (
                    <div key={idx} className="bg-gray-50 p-4 rounded-xl border">
                        <div className="flex justify-between items-center">
                            <h2 className="font-semibold">Sketch #{idx + 1}</h2>

                            {drawings.length > 1 && (
                                <button
                                    onClick={() => removeDrawing(idx)}
                                    className="text-red-600 flex items-center gap-1"
                                >
                                    <Trash size={16} /> Remove
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                            <Select
                                label="Item Type"
                                value={d.itemType}
                                options={["SOFA", "L-SHAPE", "BED", "CHAIR", "TABLE", "CUSTOM"]}
                                onChange={(v) => updateDrawing(idx, "itemType", v)}
                            />
                            <Input label="Model / Name" value={d.name} onChange={(v) => updateDrawing(idx, "name", v)} />
                            <Input label="Notes" value={d.notes} onChange={(v) => updateDrawing(idx, "notes", v)} />
                        </div>

                        <div className="flex flex-wrap gap-3 mt-4 items-center">
                            <label className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded bg-teal-50 text-teal-700">
                                <ImageIcon size={16} /> Upload Image
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => uploadImage(idx, e.target.files[0])}
                                />
                            </label>

                            {d.drawingUrl && (
                                <img
                                    src={d.drawingUrl}
                                    className="border w-24 h-20 rounded object-cover"
                                    alt={`sketch-${idx}`}
                                />
                            )}
                        </div>
                    </div>
                ))}

                <button onClick={addDrawing} className="flex items-center gap-2 px-4 py-2 rounded bg-teal-50 text-teal-700">
                    <Plus size={16} /> Add Sketch
                </button>

                <div className="flex justify-end mt-4">
                    <button
                        onClick={saveOrder}
                        className="flex items-center gap-2 px-6 py-3 rounded bg-green-600 text-white"
                    >
                        <Save size={18} /> {saving ? "Saving..." : editId ? "Update Order" : "Save Order"}
                    </button>
                </div>
            </div>
        </div>
    );
}
