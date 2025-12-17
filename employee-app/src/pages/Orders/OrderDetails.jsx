// src/pages/Orders/OrderDetails.jsx
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
    FileText,
} from "lucide-react";

/* ---------- DATE HELPERS (ADMIN SAME LOGIC) ---------- */
const fmtDate = (iso) => {
    if (!iso) return "-";
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return "-";
        return `${String(d.getDate()).padStart(2, "0")}/${String(
            d.getMonth() + 1
        ).padStart(2, "0")}/${d.getFullYear()}`;
    } catch {
        return "-";
    }
};

const resolveDate = (entry) => {
    if (!entry) return "-";

    // ✅ PRIMARY (your case)
    if (entry.paidAt) return fmtDate(entry.paidAt);

    // fallback (future safe)
    if (entry.createdAt) return fmtDate(entry.createdAt);
    if (entry.updatedAt) return fmtDate(entry.updatedAt);

    // ObjectId fallback (rare)
    if (entry._id && typeof entry._id === "string" && entry._id.length === 24) {
        const ts = parseInt(entry._id.substring(0, 8), 16) * 1000;
        return fmtDate(ts);
    }

    return "-";
};





export default function OrderDetails() {
    const { orderId } = useParams();
    const navigate = useNavigate();

    const role =
        localStorage.getItem("role") ||
        localStorage.getItem("employeeRole") ||
        "employee";

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    const [materialList, setMaterialList] = useState([]);
    const [showMaterialForm, setShowMaterialForm] = useState(false);
    const [showPaymentForm, setShowPaymentForm] = useState(false);

    const [materialForm, setMaterialForm] = useState({
        materialId: "",
        quantity: "",
        note: "",
    });

    const [paymentForm, setPaymentForm] = useState({
        amount: "",
        type: "advance",
        note: "",
    });

    /* ---------- LOAD ---------- */
    useEffect(() => {
        if (!orderId) return;
        loadOrder();
        loadMaterials();
        // eslint-disable-next-line
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

    /* ---------- ADD MATERIAL ---------- */
    const addMaterial = async (e) => {
        e.preventDefault();
        if (!materialForm.materialId || !materialForm.quantity) {
            return toast.error("Fill all fields");
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

    /* ---------- ADD PAYMENT ---------- */
    const addPayment = async (e) => {
        e.preventDefault();
        if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
            return toast.error("Enter valid amount");
        }

        try {
            await api.post(`/orders/${orderId}/payments`, {
                amount: Number(paymentForm.amount),
                type: paymentForm.type,   // advance / payment
                note: paymentForm.note,
                method: "cash",
                date: new Date().toISOString(), // ✅ ADD THIS
            });


            setShowPaymentForm(false);
            setPaymentForm({ amount: "", type: "advance", note: "" });
            await loadOrder();
            toast.success("Payment added");
        } catch (err) {
            toast.error(err?.response?.data?.message || "Payment failed");
        }
    };

    /* ---------- STATUS ---------- */
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

    /* ---------- TOTALS ---------- */
    const orderValue = Number(order.finalSalePrice ?? order.saleAmount ?? 0);

    const totalPaid = (order.payments || []).reduce(
        (s, p) => s + Number(p.amount || 0),
        0
    );

    const due = Math.max(0, orderValue - totalPaid);

    const CAN_WORK = ["confirmed", "processing", "ready_for_delivery"].includes(
        order.status
    );

    return (
        <div className="p-6 space-y-6">
            {/* TOP ACTIONS */}
            <div className="flex gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="px-4 py-2 bg-white border rounded-xl"
                >
                    <ArrowLeft size={16} /> Back
                </button>

                <button
                    onClick={() => navigate(`/billing/create?orderId=${order._id}`)}
                    className="px-4 py-2 bg-teal-600 text-white rounded-xl"
                >
                    <FileText size={16} /> Invoice
                </button>
            </div>

            {/* HEADER */}
            <div className="bg-teal-600 text-white p-6 rounded-2xl">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <User /> {order.customerName || "Walk-in"}
                </h1>
                <p className="flex items-center gap-1">
                    <Phone size={16} /> {order.customerPhone}
                </p>
                <p>Address: {order.customerAddress || "—"}</p>
            </div>

            {/* DRAWINGS */}
            {order.drawings?.length > 0 && (
                <div className="bg-white p-6 rounded-2xl shadow">
                    <h2 className="font-bold mb-4 flex items-center gap-2">
                        <ImageIcon /> Drawings
                    </h2>

                    <div className="grid md:grid-cols-3 gap-4">
                        {order.drawings.map((d, i) => (
                            <div key={d._id || `draw-${i}`} className="border p-3 rounded">
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

            {/* MATERIALS + PAYMENTS */}
            {CAN_WORK && (
                <div className="grid md:grid-cols-2 gap-6">
                    {/* MATERIALS */}
                    <div className="bg-white p-6 rounded-2xl shadow">
                        <div className="flex justify-between mb-4">
                            <h2 className="font-bold flex items-center gap-2">
                                <Package /> Materials Used
                            </h2>
                            <button
                                onClick={() => setShowMaterialForm(!showMaterialForm)}
                                className="bg-teal-600 text-white px-3 py-1 rounded-lg"
                            >
                                <PlusCircle size={16} /> Add
                            </button>
                        </div>

                        {showMaterialForm && (
                            <form
                                onSubmit={addMaterial}
                                className="grid grid-cols-4 gap-2 mb-4"
                            >
                                <select
                                    className="border p-2 rounded"
                                    value={materialForm.materialId}
                                    onChange={(e) =>
                                        setMaterialForm({
                                            ...materialForm,
                                            materialId: e.target.value,
                                        })
                                    }
                                >
                                    <option value="">Material</option>
                                    {materialList.map((m) => (
                                        <option key={m._id} value={m._id}>
                                            {m.name}
                                        </option>
                                    ))}
                                </select>

                                <input
                                    type="number"
                                    placeholder="Qty"
                                    className="border p-2 rounded"
                                    value={materialForm.quantity}
                                    onChange={(e) =>
                                        setMaterialForm({
                                            ...materialForm,
                                            quantity: e.target.value,
                                        })
                                    }
                                />

                                <input
                                    placeholder="Note"
                                    className="border p-2 rounded"
                                    value={materialForm.note}
                                    onChange={(e) =>
                                        setMaterialForm({
                                            ...materialForm,
                                            note: e.target.value,
                                        })
                                    }
                                />

                                <button className="bg-teal-600 text-white rounded">
                                    Save
                                </button>
                            </form>
                        )}

                        {/* MATERIAL TABLE */}
                        <div className="max-h-48 overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b text-gray-500">
                                    <tr>
                                        <th className="text-left py-1">Material</th>
                                        <th className="text-right py-1">Qty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(order.materialsUsed || []).map((m, i) => (
                                        <tr
                                            key={m._id || `mat-${i}`}
                                            className="border-b last:border-b-0"
                                        >
                                            <td className="py-1">
                                                {m.materialId?.name || m.name}
                                            </td>
                                            <td className="py-1 text-right font-medium">
                                                {m.quantity}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* PAYMENTS */}
                    <div className="bg-white p-6 rounded-2xl shadow">
                        <div className="flex justify-between mb-4">
                            <h2 className="font-bold">💰 Payments</h2>
                            <button
                                onClick={() => setShowPaymentForm(!showPaymentForm)}
                                className="bg-emerald-600 text-white px-3 py-1 rounded-lg"
                            >
                                <PlusCircle size={16} /> Add Payment
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
                            <Info label="Order Value" value={`₹ ${orderValue}`} />
                            <Info label="Paid" value={`₹ ${totalPaid}`} />
                            <Info label="Due" value={`₹ ${due}`} />
                        </div>

                        {/* PAYMENT LIST */}
                        <div className="max-h-48 overflow-y-auto space-y-2">
                            {(order.payments || []).map((p, i) => {
                                console.log("payment id:", p._id, "type:", typeof p._id);

                                return (
                                    <div
                                        key={p._id?.toString() || `pay-${i}`}
                                        className="border rounded-lg p-3 flex justify-between"
                                    >
                                        <div>
                                            <div className="font-medium">
                                                {p.type === "advance" ? "Advance" : "Payment"}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {resolveDate(p)}
                                            </div>
                                        </div>
                                        <div className="font-semibold">₹ {p.amount}</div>
                                    </div>
                                );
                            })}
                        </div>

                        {showPaymentForm && (
                            <form
                                onSubmit={addPayment}
                                className="grid grid-cols-4 gap-2 mt-4"
                            >
                                <input
                                    type="number"
                                    placeholder="Amount"
                                    className="border p-2 rounded"
                                    value={paymentForm.amount}
                                    onChange={(e) =>
                                        setPaymentForm({
                                            ...paymentForm,
                                            amount: e.target.value,
                                        })
                                    }
                                />

                                <select
                                    className="border p-2 rounded"
                                    value={paymentForm.type}
                                    onChange={(e) =>
                                        setPaymentForm({
                                            ...paymentForm,
                                            type: e.target.value,
                                        })
                                    }
                                >
                                    <option value="advance">Advance</option>
                                    <option value="payment">Payment</option>
                                </select>

                                <input
                                    placeholder="Note"
                                    className="border p-2 rounded"
                                    value={paymentForm.note}
                                    onChange={(e) =>
                                        setPaymentForm({
                                            ...paymentForm,
                                            note: e.target.value,
                                        })
                                    }
                                />

                                <button className="bg-emerald-600 text-white rounded">
                                    Save
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* STATUS */}
            <div className="flex gap-3 justify-center pt-4">
                {["processing", "ready_for_delivery", "delivered"].map((s) => (
                    <button
                        key={s}
                        onClick={() => updateStatus(s)}
                        className="bg-green-600 text-white px-5 py-2 rounded-xl"
                    >
                        <CheckCircle2 size={18} /> {s.replace(/_/g, " ")}
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ---------- INFO ---------- */
function Info({ label, value }) {
    return (
        <div className="bg-gray-50 p-3 rounded-xl">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="font-semibold">{value}</div>
        </div>
    );
}
