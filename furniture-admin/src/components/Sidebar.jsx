import { NavLink } from "react-router-dom";
import {
    Home,
    BarChart2,
    Package,
    ClipboardList,
    Settings,
    Users,
    Layers,
    X,
    ReceiptText,
} from "lucide-react";

const menuSections = [
    {
        title: "OVERVIEW",
        items: [
            { name: "Dashboard", icon: <Home size={18} />, path: "/" },
            { name: "Analytics", icon: <BarChart2 size={18} />, path: "/analytics" },
        ],
    },
    {
        title: "MANAGEMENT",
        items: [
            { name: "Products", icon: <Package size={18} />, path: "/products" },
            { name: "Orders", icon: <ClipboardList size={18} />, path: "/orders" },

            // ✅ NEW BILLING ROUTE
            { name: "Billing", icon: <ReceiptText size={18} />, path: "/billing" },

            { name: "Employees", icon: <Users size={18} />, path: "/employees" },
            { name: "Materials", icon: <Layers size={18} />, path: "/materials" },
        ],
    },
    {
        title: "SYSTEM",
        items: [
            { name: "Settings", icon: <Settings size={18} />, path: "/settings" },
        ],
    },
];

export default function Sidebar({ open, setOpen }) {
    return (
        <>
            {/* Overlay for mobile */}
            {open && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-30 z-30 lg:hidden"
                    onClick={() => setOpen(false)}
                ></div>
            )}

            <aside
                className={`fixed top-[76px] left-0 z-40
                h-[calc(100vh-76px)] w-64
                bg-white border-r border-gray-200 shadow-md
                flex flex-col justify-between
                transform transition-transform duration-300 ease-in-out
                ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            `}
            >
                {/* Close button for mobile */}
                <button
                    className="absolute top-3 right-3 text-gray-500 lg:hidden"
                    onClick={() => setOpen(false)}
                >
                    <X size={18} />
                </button>

                <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
                    {menuSections.map((section) => (
                        <div key={section.title}>
                            <p className="text-xs font-semibold text-gray-400 mb-2">
                                {section.title}
                            </p>

                            <div className="flex flex-col gap-1">
                                {section.items.map((item) => (
                                    <NavLink
                                        key={item.name}
                                        to={item.path}
                                        onClick={() => setOpen(false)}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200
                                            ${isActive
                                                ? "bg-[#E6FFFA] text-[#00BFA6] font-semibold"
                                                : "text-gray-700 hover:bg-[#E6FFFA] hover:text-[#00BFA6]"
                                            }`
                                        }
                                    >
                                        {item.icon}
                                        <span>{item.name}</span>
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="border-t p-4 text-xs text-gray-500 flex justify-between">
                    <span>Help & Support</span>
                    <span>v1.0.0</span>
                </div>
            </aside>
        </>
    );
}
