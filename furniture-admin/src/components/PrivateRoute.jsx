// src/components/PrivateRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PrivateRoute({ children }) {
    const { user, token, loading } = useAuth();

    // ⏳ While checking authentication
    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-screen text-gray-500">
                <div className="animate-spin h-8 w-8 border-4 border-t-transparent border-[#00bfa6] rounded-full mb-3"></div>
                <p>Checking authentication...</p>
            </div>
        );
    }

    // 🔒 No token → redirect to login
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // 🚫 Restrict non-admin access
    if (user?.role !== "admin") {
        return (
            <div className="flex justify-center items-center h-screen text-red-500 font-semibold">
                Access Denied — Admin Only 🚫
            </div>
        );
    }

    // ✅ Authorized access
    return children;
}
