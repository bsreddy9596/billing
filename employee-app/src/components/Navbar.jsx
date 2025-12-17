// src/components/Navbar.jsx
import { useNavigate } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";

export default function Navbar({ toggleSidebar }) {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("employeeToken");
        localStorage.removeItem("employeeUser");
        navigate("/login");
    };

    return (
        <nav className="fixed top-0 left-0 right-0 bg-white shadow-md z-50 border-b border-gray-200">
            <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">

                {/* Mobile Sidebar Toggle */}
                <button
                    className="lg:hidden text-gray-600"
                    onClick={toggleSidebar}
                >
                    <Menu size={26} />
                </button>

                {/* Brand Logo + Name */}
                <div
                    className="flex items-center gap-3 cursor-pointer select-none"
                    onClick={() => navigate("/orders")}
                >
                    {/* BIG LOGO */}
                    <img
                        src="/logo/sngr.png"
                        alt="Logo"
                        className="w-12 h-12 object-contain"
                    />

                    {/* BRAND NAME */}
                    <span className="text-2xl font-extrabold tracking-wide"
                        style={{
                            background: "linear-gradient(90deg, #00897B, #004D40)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent"
                        }}
                    >
                        SNGR Furniture
                    </span>
                </div>

                {/* Logout Only */}
                <button
                    onClick={handleLogout}
                    className="hidden lg:flex items-center gap-2 text-red-600 hover:text-red-700 font-semibold text-lg"
                >
                    <LogOut size={20} /> Logout
                </button>
            </div>
        </nav>
    );
}
