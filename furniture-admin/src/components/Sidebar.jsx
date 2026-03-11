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
    Clock,
    FileText, // ✅ NEW ICON FOR RECEIPTS
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

            // ✅ INVOICES
            { name: "Invoices", icon: <ReceiptText size={18} />, path: "/invoices" },

            // ✅ RECEIPTS LIST (NEW)
            { name: "Receipts", icon: <FileText size={18} />, path: "/admin/receipts" },

            // ✅ INVOICE DUE
            { name: "Invoice Due", icon: <Clock size={18} />, path: "/invoices/due" },

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
                />
            )}

            <aside
                className={`fixed top-0 left-0 z-40
                h-screen w-64
                bg-white border-r border-slate-100 shadow-[4px_0_24px_rgba(0,0,0,0.02)]
                flex flex-col justify-between
                transform transition-transform duration-300 ease-in-out
                ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            `}
            >
                {/* Company Branding Logo Area */}
                <div className="h-16 flex items-center justify-between px-5 bg-gradient-to-r from-lector-pink to-lector-purple text-white shadow-sm">
                    <div className="flex items-center gap-3 font-bold tracking-wide overflow-hidden">
                        <div className="h-10 w-10 flex-shrink-0 bg-white rounded-lg flex items-center justify-center p-1 shadow-sm relative overflow-hidden">
                            <img src="/logo/logo.png" alt="Logo" className="w-full h-full object-contain relative z-10" />
                        </div>
                        <span className="text-lg leading-tight truncate">SNGR Furnitures</span>
                    </div>
                    {/* Close button for mobile */}
                    <button
                        className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/20 lg:hidden transition-colors flex-shrink-0 ml-2"
                        onClick={() => setOpen(false)}
                    >
                        <X size={18} />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-8 custom-scrollbar">
                    {menuSections.map((section) => (
                        <div key={section.title}>
                            <p className="text-[11px] font-bold tracking-wider text-slate-400 mb-3 uppercase px-2">
                                {section.title}
                            </p>

                            <div className="flex flex-col gap-1">
                                {section.items.map((item) => (
                                    <NavLink
                                        key={item.name}
                                        to={item.path}
                                        end={
                                            item.path === "/invoices" ||
                                            item.path === "/admin/receipts"
                                        }
                                        onClick={() => setOpen(false)}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 group relative
                                            ${isActive
                                                ? "text-primary-600 font-semibold bg-primary-50/50"
                                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium"
                                            }`
                                        }
                                    >
                                        <div className={({ isActive }) => isActive ? "text-primary-500" : "text-slate-400 group-hover:text-slate-500 transition-colors"}>
                                            {item.icon}
                                        </div>
                                        <span>{item.name}</span>
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="border-t border-slate-100 p-4 text-xs font-medium text-slate-500 flex justify-between items-center bg-slate-50/50">
                    <span className="hover:text-slate-800 cursor-pointer transition-colors">Help & Support</span>
                    <span className="opacity-60">v2.0.0</span>
                </div>
            </aside>
        </>
    );
}
