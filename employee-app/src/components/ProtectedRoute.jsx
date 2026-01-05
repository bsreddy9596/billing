import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function PrivateRoute() {
    const location = useLocation();

    const employeeToken = localStorage.getItem("employeeToken");
    const adminToken = localStorage.getItem("adminToken");

    const token = employeeToken || adminToken;

    if (!token) {
        return (
            <Navigate
                to="/login"
                replace
                state={{ from: location.pathname }}
            />
        );
    }

    return <Outlet />;
}
