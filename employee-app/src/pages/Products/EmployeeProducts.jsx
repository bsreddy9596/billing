import { useEffect, useState } from "react";
import api from "../../api/api";
import { Plus, X, Upload } from "lucide-react";

const PLACEHOLDER =
    "https://via.placeholder.com/80x60.png?text=Product";

export default function EmployeeProducts() {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);

    const [form, setForm] = useState({
        name: "",
        brand: "",
        qty: "",
        sellPrice: "",
        image: null,
        preview: "",
    });

    const fetchProducts = async () => {
        const res = await api.get("/products");
        setProducts(res.data.data || []);
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleImage = (file) => {
        if (!file) return;
        setForm({
            ...form,
            image: file,
            preview: URL.createObjectURL(file),
        });
    };

    const handleSave = async () => {
        if (!form.name || !form.sellPrice) {
            alert("Name & Sell price required");
            return;
        }

        const fd = new FormData();
        fd.append("name", form.name);
        fd.append("brand", form.brand);
        fd.append("stockQty", form.qty);
        fd.append("sellPrice", form.sellPrice);
        if (form.image) fd.append("image", form.image);

        await api.post("/products", fd);

        resetModal();
        fetchProducts();
    };

    const resetModal = () => {
        setOpen(false);
        setForm({
            name: "",
            brand: "",
            qty: "",
            sellPrice: "",
            image: null,
            preview: "",
        });
    };

    const filtered = products.filter((p) =>
        p.name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-semibold">FURNITURE</h1>
                    <p className="text-sm text-gray-500">Products</p>
                </div>

                <button
                    onClick={() => setOpen(true)}
                    className="flex items-center gap-2 bg-[#00BFA6] text-white px-5 py-2 rounded-md shadow"
                >
                    <Plus size={16} /> Add Product
                </button>
            </div>

            <input
                type="text"
                placeholder="Search product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mb-4 w-64 border px-3 py-2 rounded-md text-sm"
            />

            <div className="bg-white border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b text-xs uppercase">
                        <tr>
                            <th className="p-4 text-left">Image</th>
                            <th className="p-4 text-left">Name</th>
                            <th className="p-4 text-left">Brand</th>
                            <th className="p-4 text-center">Qty</th>
                            <th className="p-4 text-right">Sell</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan="5" className="p-6 text-center text-gray-400">
                                    No products found
                                </td>
                            </tr>
                        )}

                        {filtered.map((p) => (
                            <tr
                                key={p._id}
                                className={`border-b ${p.stockQty <= 3 ? "bg-red-50" : ""}`}
                            >
                                <td className="p-4">
                                    <img
                                        src={p.image || PLACEHOLDER}
                                        className="w-20 h-14 object-cover rounded"
                                    />
                                </td>
                                <td className="p-4 font-semibold">{p.name}</td>
                                <td className="p-4 text-gray-600">{p.brand || "—"}</td>
                                <td
                                    className={`p-4 text-center font-semibold ${p.stockQty <= 3 ? "text-red-600" : ""
                                        }`}
                                >
                                    {p.stockQty || 0}
                                </td>
                                <td className="p-4 text-right font-semibold">
                                    ₹{p.sellPrice}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {open && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white w-[420px] rounded-xl p-6 relative">
                        <button
                            onClick={resetModal}
                            className="absolute top-4 right-4 text-gray-400"
                        >
                            <X />
                        </button>

                        <h2 className="text-lg font-semibold mb-4">
                            Add Product
                        </h2>

                        <label className="block mb-3">
                            <div className="border-dashed border-2 p-4 rounded-md text-center cursor-pointer">
                                {form.preview ? (
                                    <img
                                        src={form.preview}
                                        className="mx-auto h-24 object-cover"
                                    />
                                ) : (
                                    <div className="text-gray-400 flex flex-col items-center">
                                        <Upload size={20} />
                                        Upload Image
                                    </div>
                                )}
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleImage(e.target.files[0])}
                            />
                        </label>

                        <input
                            placeholder="Name"
                            className="w-full border p-2 rounded mb-2"
                            value={form.name}
                            onChange={(e) =>
                                setForm({ ...form, name: e.target.value })
                            }
                        />
                        <input
                            placeholder="Brand"
                            className="w-full border p-2 rounded mb-2"
                            value={form.brand}
                            onChange={(e) =>
                                setForm({ ...form, brand: e.target.value })
                            }
                        />
                        <input
                            placeholder="Quantity"
                            type="number"
                            className="w-full border p-2 rounded mb-2"
                            value={form.qty}
                            onChange={(e) =>
                                setForm({ ...form, qty: e.target.value })
                            }
                        />
                        <input
                            placeholder="Sell Price"
                            type="number"
                            className="w-full border p-2 rounded mb-4"
                            value={form.sellPrice}
                            onChange={(e) =>
                                setForm({ ...form, sellPrice: e.target.value })
                            }
                        />

                        <button
                            onClick={handleSave}
                            className="w-full bg-[#00BFA6] text-white py-2 rounded-md"
                        >
                            Save Product
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
