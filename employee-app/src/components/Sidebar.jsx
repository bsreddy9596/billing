import { NavLink, useNavigate } from "react-router-dom";
import {
    ClipboardList,
    FileText,
    Package,
    Layers,
    X,
    LayoutDashboard,
    LogOut,
    BookOpen,
    Zap,
    AlertCircle,
} from "lucide-react";

export default function Sidebar({ open, setOpen }) {
    const navigate = useNavigate();

    const employeeToken = localStorage.getItem("employeeToken");
    const adminToken = localStorage.getItem("adminToken");

    if (!employeeToken && !adminToken) return null;

    const logout = () => {
        localStorage.removeItem("employeeToken");
        localStorage.removeItem("adminToken");
        localStorage.removeItem("employeeUser");
        localStorage.removeItem("adminUser");
        localStorage.removeItem("role");
        navigate("/login", { replace: true });
    };

    const linkClass = ({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg transition-all
        ${isActive
            ? "bg-[#E6FFFA] text-[#00BFA6] font-semibold"
            : "text-gray-700 hover:bg-[#E6FFFA] hover:text-[#00BFA6]"
        }`;

    return (
        <>
            {open && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                    onClick={() => setOpen(false)}
                />
            )}

            <aside
                className={`fixed top-[64px] left-0 z-50
                h-[calc(100vh-64px)] w-64 bg-white shadow-xl border-r
                transform transition-transform duration-300 ease-in-out
                ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
            >
                <button
                    onClick={() => setOpen(false)}
                    className="absolute top-3 right-3 text-gray-600 lg:hidden"
                >
                    <X size={20} />
                </button>

                <nav className="px-5 py-4 flex flex-col h-full justify-between">
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-400 mb-2">
                            MENU
                        </p>

                        <NavLink to="/" onClick={() => setOpen(false)} className={linkClass}>
                            <LayoutDashboard size={18} />
                            Dashboard
                        </NavLink>

                        <NavLink to="/orders" onClick={() => setOpen(false)} className={linkClass}>
                            <ClipboardList size={18} />
                            Orders
                        </NavLink>

                        <NavLink to="/billing" onClick={() => setOpen(false)} className={linkClass}>
                            <FileText size={18} />
                            Billing
                        </NavLink>

                        <NavLink
                            to="/billing/quick"
                            onClick={() => setOpen(false)}
                            className={linkClass}
                        >
                            <Zap size={18} />
                            Quick Billing
                        </NavLink>

                        {/* ✅ DUE INVOICES */}
                        <NavLink
                            to="/dues"
                            onClick={() => setOpen(false)}
                            className={linkClass}
                        >
                            <AlertCircle size={18} />
                            Due Invoices
                        </NavLink>

                        <NavLink to="/products" onClick={() => setOpen(false)} className={linkClass}>
                            <Package size={18} />
                            Products
                        </NavLink>

                        <NavLink to="/materials" onClick={() => setOpen(false)} className={linkClass}>
                            <Layers size={18} />
                            Materials
                        </NavLink>

                        <NavLink to="/ledger" onClick={() => setOpen(false)} className={linkClass}>
                            <BookOpen size={18} />
                            Ledger
                        </NavLink>
                    </div>

                    <button
                        onClick={logout}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg
                        text-red-600 hover:bg-red-50 transition"
                    >
                        <LogOut size={18} />
                        Logout
                    </button>
                </nav>
            </aside>
        </>
    );
}
