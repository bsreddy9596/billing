import { useEffect, useState } from "react";
import api from "../api/api";
import toast from "react-hot-toast";

export default function ProductInvoiceForm() {
    const [products, setProducts] = useState([]);
    const [item, setItem] = useState(null);
    const [qty, setQty] = useState(1);

    useEffect(() => {
        api.get("/products").then((r) => setProducts(r.data.data));
    }, []);

    const submit = async () => {
        if (!item) return toast.error("Select product");

        if (qty > item.stockQty)
            return toast.error("Insufficient stock");

        await api.post("/invoices", {
            invoiceType: "product",
            customerName: "Walk-in Customer",
            items: [
                {
                    productId: item._id,
                    description: item.name,
                    qty,
                    rate: item.salePrice,
                },
            ],
        });

        toast.success("Invoice created");
    };

    return (
        <div className="p-6 max-w-lg space-y-4">
            <h1 className="text-xl font-bold">Product Invoice</h1>

            <select
                onChange={(e) =>
                    setItem(products.find((p) => p._id === e.target.value))
                }
                className="border p-2 w-full"
            >
                <option>Select Product</option>
                {products.map((p) => (
                    <option key={p._id} value={p._id}>
                        {p.name}
                    </option>
                ))}
            </select>

            {item && (
                <div className="text-sm text-gray-600">
                    Stock: {item.stockQty} | Price: ₹{item.salePrice}
                </div>
            )}

            <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                className="border p-2 w-full"
            />

            <button
                onClick={submit}
                className="bg-teal-600 text-white px-4 py-2 rounded"
            >
                Create Invoice
            </button>
        </div>
    );
}
