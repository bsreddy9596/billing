// components/analytics/ProfitModal.jsx
import OrderProfitTable from "./OrderProfitTable";

export default function ProfitModal({ onClose, dateRange }) {
    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl w-[90%] max-w-5xl p-6">
                <div className="flex justify-between mb-4">
                    <h2 className="text-xl font-bold">
                        📦 Order-wise Profit
                    </h2>
                    <button onClick={onClose}>✖</button>
                </div>

                <OrderProfitTable dateRange={dateRange} />
            </div>
        </div>
    );
}
