import { Navigate, Outlet } from "react-router-dom";

export default function PrivateRoute() {
    const token =
        localStorage.getItem("employeeToken") ||
        localStorage.getItem("adminToken");

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}
