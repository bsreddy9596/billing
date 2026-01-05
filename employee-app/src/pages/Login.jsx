import { useState } from "react";
import api from "../api/api";
import toast from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { User, Key } from "lucide-react";

export default function EmployeeLogin() {
    const [employeeCode, setEmployeeCode] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();

    const loginEmployee = async () => {
        if (!employeeCode.trim() || !password.trim()) {
            return toast.error("Enter Employee Code & Password");
        }

        setLoading(true);
        try {
            const res = await api.post("/auth/employee/login", {
                employeeCode,
                password,
            });

            const { token, name, role, phone } = res.data;

            if (role !== "employee") {
                return toast.error("Only employees can login");
            }

            /* ✅ CLEAR OTHER TOKENS */
            localStorage.removeItem("adminToken");
            localStorage.removeItem("adminUser");

            /* ✅ SAVE EMPLOYEE AUTH */
            localStorage.setItem("employeeToken", token);
            localStorage.setItem(
                "employeeUser",
                JSON.stringify({ name, phone, role, employeeCode })
            );
            localStorage.setItem("role", "employee");

            toast.success(`Welcome ${name}`);

            /* 🔥 IMPORTANT FIX */
            const redirectTo = location.state?.from || "/";
            navigate(redirectTo, { replace: true });

        } catch (err) {
            toast.error(err.response?.data?.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") loginEmployee();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E6FFF8] to-[#F0FFFB] px-4">
            <div className="bg-white shadow-2xl rounded-2xl w-full max-w-md p-6 sm:p-8 border border-[#00BFA6]/30">

                <h1 className="text-center text-3xl font-extrabold bg-gradient-to-r from-[#00BFA6] to-[#008a74] bg-clip-text text-transparent mb-2">
                    SNGR Furniture
                </h1>

                <h2 className="text-xl font-bold text-center text-[#00796B] mb-6">
                    Employee Login
                </h2>

                <div className="space-y-1 mb-4">
                    <label className="text-sm text-gray-600">Employee Code</label>
                    <div className="flex items-center border rounded-lg px-3 py-2">
                        <User className="text-[#00BFA6] mr-2" size={20} />
                        <input
                            type="text"
                            value={employeeCode}
                            onChange={(e) => setEmployeeCode(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full outline-none"
                        />
                    </div>
                </div>

                <div className="space-y-1 mb-6">
                    <label className="text-sm text-gray-600">Password</label>
                    <div className="flex items-center border rounded-lg px-3 py-2">
                        <Key className="text-[#00BFA6] mr-2" size={20} />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full outline-none"
                        />
                    </div>
                </div>

                <button
                    onClick={loginEmployee}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#00BFA6] to-[#008a74]
          text-white py-2.5 rounded-lg font-semibold"
                >
                    {loading ? "Logging in..." : "Login"}
                </button>
            </div>
        </div>
    );
}
