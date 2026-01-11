import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api";
import toast from "react-hot-toast";
import {
    User,
    Phone,
    Package,
    PlusCircle,
    CheckCircle2,
    Image as ImageIcon,
    ArrowLeft,
} from "lucide-react";

export default function OrderDetails() {
    const { orderId } = useParams();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    const [materialList, setMaterialList] = useState([]);
    const [showMaterialForm, setShowMaterialForm] = useState(false);

    const [materialForm, setMaterialForm] = useState({
        materialId: "",
        quantity: "",
        note: "",
    });

    useEffect(() => {
        if (!orderId) return;
        loadOrder();
        loadMaterials();
    }, [orderId]);

    const loadOrder = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/orders/single/${orderId}`);
            setOrder(res.data.data);
        } catch {
            toast.error("Failed to load order");
        } finally {
            setLoading(false);
        }
    };

    const loadMaterials = async () => {
        try {
            const res = await api.get("/materials");
            setMaterialList(res.data.data || []);
        } catch { }
    };

    const addMaterial = async (e) => {
        e.preventDefault();
        if (!materialForm.materialId || !materialForm.quantity) {
            toast.error("Fill all fields");
            return;
        }

        try {
            await api.put(`/orders/${orderId}/materials`, {
                materials: [
                    {
                        materialId: materialForm.materialId,
                        quantity: Number(materialForm.quantity),
                        note: materialForm.note || "",
                    },
                ],
            });

            setShowMaterialForm(false);
            setMaterialForm({ materialId: "", quantity: "", note: "" });
            await loadOrder();
            toast.success("Material added");
        } catch {
            toast.error("Failed to add material");
        }
    };

    const updateStatus = async (status) => {
        try {
            await api.put(`/orders/${orderId}/status`, { status });
            await loadOrder();
            toast.success("Status updated");
        } catch {
            toast.error("Failed to update status");
        }
    };

    if (loading) return <p className="p-6">Loading...</p>;
    if (!order) return null;

    const isConfirmed = order.status !== "pending";

    return (
        <div className="p-6 space-y-6">
            <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 bg-white border rounded-xl flex items-center gap-2"
            >
                <ArrowLeft size={16} /> Back
            </button>

            <div className="bg-teal-600 text-white p-6 rounded-2xl">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <User /> {order.customerName || "Walk-in"}
                </h1>
                <p className="flex items-center gap-1">
                    <Phone size={16} /> {order.customerPhone}
                </p>
                <p>Address: {order.customerAddress || "—"}</p>
            </div>

            {order.drawings?.length > 0 && (
                <div className="bg-white p-6 rounded-2xl shadow">
                    <h2 className="font-semibold mb-4 flex items-center gap-2 text-gray-800">
                        <ImageIcon size={18} /> Drawings
                    </h2>

                    <div className="grid md:grid-cols-3 gap-4">
                        {order.drawings.map((d, i) => (
                            <div
                                key={d._id || `draw-${i}`}
                                className="border rounded-xl p-3 bg-gray-50"
                            >
                                {d.drawingUrl ? (
                                    <img
                                        src={d.drawingUrl}
                                        alt="drawing"
                                        className="w-full h-40 object-contain"
                                    />
                                ) : (
                                    <div className="h-40 flex items-center justify-center text-gray-400">
                                        No Image
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isConfirmed && (
                <div className="bg-white p-6 rounded-2xl shadow border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                            <Package size={18} /> Materials Used
                        </h2>

                        <button
                            onClick={() => setShowMaterialForm(!showMaterialForm)}
                            className="flex items-center gap-1 bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-sm"
                        >
                            <PlusCircle size={16} /> Add Material
                        </button>
                    </div>

                    {showMaterialForm && (
                        <form
                            onSubmit={addMaterial}
                            className="grid grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl mb-4"
                        >
                            <select
                                className="border rounded-lg p-2 text-sm"
                                value={materialForm.materialId}
                                onChange={(e) =>
                                    setMaterialForm({
                                        ...materialForm,
                                        materialId: e.target.value,
                                    })
                                }
                            >
                                <option value="">Select Material</option>
                                {materialList.map((m) => (
                                    <option key={m._id} value={m._id}>
                                        {m.name} ({m.unit}) – Available: {m.availableQty}
                                    </option>
                                ))}
                            </select>



                            <input
                                type="number"
                                placeholder="Quantity"
                                className="border rounded-lg p-2 text-sm"
                                value={materialForm.quantity}
                                onChange={(e) =>
                                    setMaterialForm({
                                        ...materialForm,
                                        quantity: e.target.value,
                                    })
                                }
                            />

                            <input
                                placeholder="Note (optional)"
                                className="border rounded-lg p-2 text-sm"
                                value={materialForm.note}
                                onChange={(e) =>
                                    setMaterialForm({
                                        ...materialForm,
                                        note: e.target.value,
                                    })
                                }
                            />

                            <button className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm">
                                Save
                            </button>
                        </form>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full border border-gray-200 rounded-xl overflow-hidden">
                            <thead className="bg-gray-100 text-gray-600 text-sm">
                                <tr>
                                    <th className="px-4 py-3 text-left">Material</th>
                                    <th className="px-4 py-3 text-left">Quality</th>
                                    <th className="px-4 py-3 text-right">Used Qty</th>
                                </tr>
                            </thead>



                            <tbody className="text-sm">
                                {(order.materialsUsed || []).length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="px-4 py-6 text-center text-gray-400">
                                            No materials added
                                        </td>
                                    </tr>
                                ) : (
                                    order.materialsUsed.map((m, i) => (
                                        <tr key={i} className="border-t hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-800">
                                                {m.name}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {m.unit}
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-gray-700">
                                                {m.quantity}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>


                        </table>
                    </div>
                </div>
            )}

            {isConfirmed && (
                <div className="flex gap-3 justify-center pt-4">
                    {["processing", "ready_for_delivery", "delivered"].map(
                        (s) => (
                            <button
                                key={s}
                                onClick={() => updateStatus(s)}
                                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl flex items-center gap-2"
                            >
                                <CheckCircle2 size={18} />
                                {s.replace(/_/g, " ")}
                            </button>
                        )
                    )}
                </div>
            )}
        </div>
    );
}
