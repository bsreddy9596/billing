import { useAuth } from "../context/AuthContext";

export default function AdminRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) return null;

    if (user?.role !== "admin") {
        return (
            <div className="flex justify-center items-center h-screen text-red-500 font-semibold">
                Access Denied — Admin Only 🚫
            </div>
        );
    }

    return children;
}
