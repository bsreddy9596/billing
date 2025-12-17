import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { AuthContext } from "../context/AuthContext";

export default function AdminLogin() {
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogin = async () => {
        if (!phone.trim() || !password.trim()) {
            alert("Please enter phone & password");
            return;
        }

        try {
            setLoading(true);

            const res = await api.post("/auth/admin/login", { phone, password });

            // Store ADMIN TOKEN only
            localStorage.setItem("adminToken", res.data.token);
            localStorage.setItem(
                "adminUser",
                JSON.stringify({
                    role: res.data.role,
                    name: res.data.name,
                    phone: res.data.phone,
                })
            );

            // Update AuthContext
            login(res.data.token, {
                role: res.data.role,
                name: res.data.name,
                phone: res.data.phone,
            });

            navigate("/", { replace: true });
        } catch (err) {
            alert(err.response?.data?.message || "Invalid credentials or login failed");
        } finally {
            setLoading(false);
        }
    };

    // ⭐ ENTER → LOGIN
    const handleEnter = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleLogin();
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f6f9fc] to-[#edf2f7]"
            onKeyDown={handleEnter}
        >
            <div className="bg-white w-[400px] p-10 rounded-2xl shadow-xl border border-gray-100">

                {/* Logo + Title */}
                <div className="text-center mb-6">
                    <div className="mx-auto mb-3 w-14 h-14 flex items-center justify-center 
                        rounded-full bg-[#00bfa6]/10 text-[#00bfa6] font-bold text-2xl">
                        S
                    </div>

                    <h1 className="text-3xl font-semibold text-gray-800 mb-1">
                        SNGR <span className="text-[#00bfa6]">Furnitures</span>
                    </h1>

                    <p className="text-gray-500 text-sm">Admin Portal Login</p>
                </div>

                {/* Inputs */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-gray-600 text-sm mb-1">Phone Number</label>
                        <input
                            type="text"
                            placeholder="Enter your phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg p-3 
                            focus:outline-none focus:ring-2 focus:ring-[#00bfa6] text-gray-700"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-600 text-sm mb-1">Password</label>
                        <input
                            type="password"
                            placeholder="Enter password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg p-3 
                            focus:outline-none focus:ring-2 focus:ring-[#00bfa6] text-gray-700"
                        />
                    </div>
                </div>

                {/* Login Button */}
                <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="mt-6 w-full bg-[#00bfa6] hover:bg-[#00a68e] text-white 
                    font-semibold py-3 rounded-lg transition-all duration-200 shadow-md"
                >
                    {loading ? "Logging in..." : "Login"}
                </button>

                {/* Footer */}
                <p className="mt-6 text-center text-sm text-gray-500">
                    Forgot password?{" "}
                    <a href="#" className="text-[#00bfa6] hover:underline font-medium">
                        Reset here
                    </a>
                </p>
            </div>
        </div>
    );
}
