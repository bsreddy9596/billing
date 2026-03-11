// src/pages/Orders/CreateOrder.jsx (ADMIN VERSION – FINAL FIXED)
import React, { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";

import api from "../api/api";
import { Plus, Trash, Image as ImageIcon, Save, ArrowLeft, Ruler, StickyNote } from "lucide-react";
import Button from "../components/ui/Button";
import { Input, Label } from "../components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../components/ui/Card";


/* ------------------------------------------------------ */
/* DEFAULT DRAWING OBJECT                                 */
/* ------------------------------------------------------ */
const newDrawing = () => ({
    itemType: "SOFA",
    name: "",
    notes: "",
    drawingUrl: "",
    materials: [],
    measurements: {},
});

/* ------------------------------------------------------ */
/* MAIN ADMIN COMPONENT                                   */
/* ------------------------------------------------------ */
export default function CreateOrder() {
    const navigate = useNavigate();
    const [params] = useSearchParams();

    const editId = params.get("edit"); // ADMIN EDIT MODE

    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const [expectedDelivery, setExpectedDelivery] = useState("");
    const [drawings, setDrawings] = useState([newDrawing()]);
    const [saving, setSaving] = useState(false);

    /* ------------------------------------------------------ */
    /* LOAD ORDER (ADMIN EDIT MODE)                           */
    /* ------------------------------------------------------ */
    useEffect(() => {
        if (!editId) return;

        const loadOrder = async () => {
            try {
                const res = await api.get(`/orders/single/${editId}`);
                const o = res.data.data;

                setCustomerName(o.customerName || "");
                setCustomerPhone(o.customerPhone || "");
                setCustomerAddress(o.customerAddress || "");
                if (o.expectedDelivery) {
                    setExpectedDelivery(new Date(o.expectedDelivery).toISOString().split('T')[0]);
                }

                if (o.drawings?.length) {
                    setDrawings(
                        o.drawings.map((d) => ({
                            itemType: d.itemType || "SOFA",
                            name: d.name || "",
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

    /* ------------------------------------------------------ */
    /* DRAWING HELPERS                                       */
    /* ------------------------------------------------------ */
    const addDrawing = () => setDrawings([...drawings, newDrawing()]);

    const removeDrawing = (i) =>
        setDrawings(drawings.filter((_, idx) => idx !== i));

    const updateDrawing = (i, key, value) => {
        const list = [...drawings];
        list[i] = { ...list[i], [key]: value };
        setDrawings(list);
    };

    /* ------------------------------------------------------ */
    /* IMAGE UPLOAD (SAFE + FIXED)                            */
    /* ------------------------------------------------------ */
    const uploadImage = async (i, file) => {
        if (!file) return;

        try {
            const data = new FormData();
            data.append("file", file);

            const res = await api.post("/upload", data);
            let url = res.data.url;

            // Convert to absolute URL if needed
            if (!url.startsWith("http")) {
                const base =
                    import.meta.env.VITE_API_URL?.replace("/api", "") || "";
                url = base + url;
            }

            updateDrawing(i, "drawingUrl", url);
            toast.success("Image uploaded");
        } catch (err) {
            console.error(err);
            toast.error("Image upload failed");
        }
    };

    /* ------------------------------------------------------ */
    /* SAVE ORDER (CREATE / ADMIN UPDATE)                     */
    /* ------------------------------------------------------ */
    const saveOrder = async () => {
        if (!customerName.trim())
            return toast.error("Customer name required");

        if (!drawings[0]?.name.trim())
            return toast.error("First sketch name required");

        setSaving(true);

        const payload = {
            customerName,
            customerPhone,
            customerAddress,
            expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : undefined,
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
                await api.put(`/orders/${editId}?override=admin`, payload);
                toast.success("Order updated successfully");
            } else {
                await api.post("/orders", payload);
                toast.success("Order created successfully");
            }

            navigate("/orders");
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Save failed");
        } finally {
            setSaving(false);
        }
    };

    /* ------------------------------------------------------ */
    /* UI                                                     */
    /* ------------------------------------------------------ */
    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto">
            <Toaster />

            <div className="flex items-center gap-4 mb-6 animate-fade-in-up">
                <Button variant="ghost" className="hidden sm:flex" onClick={() => navigate(-1)}>
                    <ArrowLeft size={18} className="mr-2" /> Back
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        {editId ? "Edit Order" : "Create New Order"}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {editId ? `Update details for this customer order.` : `Fill out the details to create a new production order.`}
                    </p>
                </div>
            </div>

            <Card className="shadow-lg border-0 bg-white/50 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: "100ms" }}>
                <CardHeader className="bg-white border-b border-slate-100 rounded-t-xl pb-4">
                    <CardTitle className="text-lg text-slate-800">Customer Details</CardTitle>
                </CardHeader>
                <CardContent className="p-6 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1.5">
                            <Label>Customer Name <span className="text-rose-500">*</span></Label>
                            <Input
                                placeholder="E.g. John Doe"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Phone Number</Label>
                            <Input
                                placeholder="+91 9876543210"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Delivery Address</Label>
                            <Input
                                placeholder="Full Address..."
                                value={customerAddress}
                                onChange={(e) => setCustomerAddress(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Delivery Date</Label>
                            <Input
                                type="date"
                                value={expectedDelivery}
                                onChange={(e) => setExpectedDelivery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="mt-8 mb-4 flex items-center justify-between animate-fade-in-up" style={{ animationDelay: "200ms" }}>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Ruler size={20} className="text-primary" /> Drawings & Sketches
                </h2>
                <Button variant="outline" size="sm" onClick={addDrawing} className="gap-2">
                    <Plus size={16} /> Add Sketch
                </Button>
            </div>

            <div className="space-y-6">
                {drawings.map((d, idx) => (
                    <Card key={idx} className="overflow-hidden border-slate-200 animate-fade-in-up" style={{ animationDelay: `${250 + idx * 50}ms` }}>
                        <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 flex flex-row items-center justify-between">
                            <CardTitle className="text-base font-semibold text-slate-700">Sketch #{idx + 1}</CardTitle>
                            {drawings.length > 1 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeDrawing(idx)}
                                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 h-8"
                                >
                                    <Trash size={14} className="mr-1" /> Remove
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-1.5">
                                    <Label>Item Category</Label>
                                    <select
                                        value={d.itemType}
                                        onChange={(e) => updateDrawing(idx, "itemType", e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                                    >
                                        {["SOFA", "L-SHAPE", "BED", "CHAIR", "TABLE", "CUSTOM"].map((o) => (
                                            <option key={o} value={o}>{o}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Model / Name <span className="text-rose-500">*</span></Label>
                                    <Input
                                        placeholder="e.g. Modern L-Shape Sofa"
                                        value={d.name}
                                        onChange={(e) => updateDrawing(idx, "name", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Notes & Specifications</Label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <StickyNote size={14} className="text-slate-400" />
                                        </div>
                                        <Input
                                            className="pl-9"
                                            placeholder="Specific details..."
                                            value={d.notes}
                                            onChange={(e) => updateDrawing(idx, "notes", e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* IMAGE UPLOAD */}
                            <div className="mt-6 p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                                <div className="flex-1">
                                    <h4 className="text-sm font-semibold text-slate-800 mb-1">Design Image</h4>
                                    <p className="text-xs text-slate-500 mb-3">Upload a reference image or 2D/3D drawing for this item.</p>
                                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-primary text-primary hover:bg-primary/5 rounded-md font-medium text-sm transition-colors">
                                        <ImageIcon size={16} /> {d.drawingUrl ? "Change Image" : "Upload Image"}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                uploadImage(idx, file);
                                                e.target.value = ""; // ⭐ IMPORTANT RESET
                                            }}
                                        />
                                    </label>
                                </div>

                                {d.drawingUrl ? (
                                    <div className="relative h-28 w-40 rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm flex-shrink-0 group">
                                        <img
                                            src={d.drawingUrl}
                                            alt={`sketch-${idx}`}
                                            className="w-full h-full object-contain"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-white text-xs font-medium">Uploaded</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-28 w-40 rounded-lg border border-slate-200 border-dashed bg-slate-100 flex flex-col items-center justify-center text-slate-400 flex-shrink-0">
                                        <ImageIcon size={24} className="mb-2 opacity-50" />
                                        <span className="text-xs font-medium">No Image</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* SAVE ACTION */}
            <div className="mt-8 flex justify-end gap-3 animate-fade-in-up" style={{ animationDelay: "400ms" }}>
                <Button variant="outline" onClick={() => navigate(-1)} disabled={saving}>
                    Cancel
                </Button>
                <Button
                    variant="primary"
                    onClick={saveOrder}
                    disabled={saving}
                    className="px-8"
                >
                    <Save size={18} className="mr-2" />
                    {saving ? "Saving..." : editId ? "Update Order" : "Publish Order"}
                </Button>
            </div>
        </div>
    );
}
