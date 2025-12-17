import { useEffect, useState } from "react";
import api from "../api/api";
import toast, { Toaster } from "react-hot-toast";
import {
    User,
    Lock,
    Settings,
    Save,
    Building2,
    Palette,
    Bell,
    Upload,
} from "lucide-react";

export default function SettingsPage() {
    const [tab, setTab] = useState("profile");
    const [profile, setProfile] = useState({ name: "", phone: "", email: "" });
    const [passwords, setPasswords] = useState({ oldPassword: "", newPassword: "" });
    const [preferences, setPreferences] = useState({
        theme: "light",
        currency: "₹",
        dateFormat: "DD/MM/YYYY",
    });
    const [company, setCompany] = useState({ name: "", address: "", logo: "" });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await api.get("/users/me");
            setProfile(res.data.data || {});
        } catch (err) {
            toast.error("Failed to load profile");
        }
    };

    const handleProfileSave = async () => {
        try {
            await api.put("/users/me", profile);
            toast.success("Profile updated!");
        } catch {
            toast.error("Update failed");
        }
    };

    const handlePasswordChange = async () => {
        try {
            await api.put("/users/change-password", passwords);
            toast.success("Password changed!");
            setPasswords({ oldPassword: "", newPassword: "" });
        } catch {
            toast.error("Password change failed");
        }
    };

    const handlePrefSave = () => {
        localStorage.setItem("appPreferences", JSON.stringify(preferences));
        toast.success("Preferences saved!");
    };

    return (
        <div className="p-6 space-y-6 bg-gradient-to-br from-white via-[#F0FFFB] to-[#E6FFF8] min-h-screen">
            <Toaster position="top-right" />
            <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-2">
                <Settings className="text-[#00BFA6]" /> Settings
            </h1>

            {/* Tabs */}
            <div className="flex gap-3 border-b border-gray-200">
                {[
                    { id: "profile", label: "Profile", icon: <User size={16} /> },
                    { id: "security", label: "Security", icon: <Lock size={16} /> },
                    { id: "preferences", label: "Preferences", icon: <Palette size={16} /> },
                    { id: "company", label: "Company", icon: <Building2 size={16} /> },
                    { id: "notifications", label: "Notifications", icon: <Bell size={16} /> },
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setTab(item.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition ${tab === item.id
                            ? "bg-white text-[#00BFA6] border-t-2 border-[#00A28E]"
                            : "text-gray-500 hover:text-[#00BFA6]"
                            }`}
                    >
                        {item.icon} {item.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-5">
                {tab === "profile" && (
                    <>
                        <h2 className="text-lg font-semibold text-gray-700 mb-3">
                            🧑‍💼 Profile Information
                        </h2>
                        <div className="space-y-3">
                            <Input
                                placeholder="Name"
                                value={profile.name}
                                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                            />
                            <Input
                                placeholder="Phone"
                                value={profile.phone}
                                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                            />
                            <Input
                                type="email"
                                placeholder="Email"
                                value={profile.email}
                                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                            />
                            <ButtonMint onClick={handleProfileSave} icon={<Save size={16} />}>
                                Save Changes
                            </ButtonMint>
                        </div>
                    </>
                )}

                {tab === "security" && (
                    <>
                        <h2 className="text-lg font-semibold text-gray-700 mb-3">🔒 Security</h2>
                        <div className="space-y-3">
                            <Input
                                type="password"
                                placeholder="Old Password"
                                value={passwords.oldPassword}
                                onChange={(e) =>
                                    setPasswords({ ...passwords, oldPassword: e.target.value })
                                }
                            />
                            <Input
                                type="password"
                                placeholder="New Password"
                                value={passwords.newPassword}
                                onChange={(e) =>
                                    setPasswords({ ...passwords, newPassword: e.target.value })
                                }
                            />
                            <ButtonGreen onClick={handlePasswordChange} icon={<Save size={16} />}>
                                Change Password
                            </ButtonGreen>
                        </div>
                    </>
                )}

                {tab === "preferences" && (
                    <>
                        <h2 className="text-lg font-semibold text-gray-700 mb-3">
                            🎨 Preferences
                        </h2>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <Select
                                label="Theme"
                                value={preferences.theme}
                                options={[
                                    { value: "light", label: "Light Mode" },
                                    { value: "dark", label: "Dark Mode" },
                                ]}
                                onChange={(e) =>
                                    setPreferences({ ...preferences, theme: e.target.value })
                                }
                            />
                            <Select
                                label="Currency"
                                value={preferences.currency}
                                options={[
                                    { value: "₹", label: "INR (₹)" },
                                    { value: "$", label: "USD ($)" },
                                ]}
                                onChange={(e) =>
                                    setPreferences({ ...preferences, currency: e.target.value })
                                }
                            />
                            <Select
                                label="Date Format"
                                value={preferences.dateFormat}
                                options={[
                                    { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
                                    { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
                                ]}
                                onChange={(e) =>
                                    setPreferences({ ...preferences, dateFormat: e.target.value })
                                }
                            />
                        </div>
                        <ButtonMint
                            onClick={handlePrefSave}
                            icon={<Save size={16} />}
                            className="mt-4"
                        >
                            Save Preferences
                        </ButtonMint>
                    </>
                )}

                {tab === "company" && (
                    <>
                        <h2 className="text-lg font-semibold text-gray-700 mb-3">
                            🏢 Company Info
                        </h2>
                        <div className="space-y-3">
                            <Input
                                placeholder="Company Name"
                                value={company.name}
                                onChange={(e) => setCompany({ ...company, name: e.target.value })}
                            />
                            <textarea
                                placeholder="Address"
                                value={company.address}
                                onChange={(e) => setCompany({ ...company, address: e.target.value })}
                                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#00BFA6] outline-none"
                            />
                            <div className="flex items-center gap-3">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) =>
                                        setCompany({
                                            ...company,
                                            logo: URL.createObjectURL(e.target.files[0]),
                                        })
                                    }
                                    className="border rounded-lg px-3 py-2 text-sm"
                                />
                                {company.logo && (
                                    <img
                                        src={company.logo}
                                        alt="Logo Preview"
                                        className="w-14 h-14 object-cover rounded-md border"
                                    />
                                )}
                            </div>
                            <ButtonGreen icon={<Upload size={16} />}>Save Company Info</ButtonGreen>
                        </div>
                    </>
                )}

                {tab === "notifications" && (
                    <p className="text-gray-500 italic">
                        🔔 Notification settings will be available in the next update.
                    </p>
                )}
            </div>
        </div>
    );
}

/* 🧩 Reusable Components */

function Input({ ...props }) {
    return (
        <input
            {...props}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#00BFA6] outline-none"
        />
    );
}

function Select({ label, value, onChange, options }) {
    return (
        <select
            value={value}
            onChange={onChange}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#00BFA6] outline-none"
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    );
}

function ButtonMint({ icon, children, onClick, className = "" }) {
    return (
        <button
            onClick={onClick}
            className={`bg-gradient-to-r from-[#00BFA6] to-[#00A28E] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition ${className}`}
        >
            {icon} {children}
        </button>
    );
}

function ButtonGreen({ icon, children, onClick }) {
    return (
        <button
            onClick={onClick}
            className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition"
        >
            {icon} {children}
        </button>
    );
}
