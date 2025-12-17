import { Bell, LogOut, Menu, Sun, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/api";
import socket from "../socket"; // ✅ CORRECT PATH
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function Navbar({ toggleSidebar }) {
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    /* ================= NOTIFICATION STATE ================= */
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const dropdownRef = useRef(null);

    const unreadCount = notifications.filter((n) => !n.read).length;

    /* ================= FETCH NOTIFICATIONS ================= */
    const fetchNotifications = async () => {
        try {
            const res = await api.get("/notifications");
            setNotifications(res.data.data || []);
        } catch (err) {
            console.error("Notification fetch failed");
        }
    };

    /* ================= INITIAL LOAD ================= */
    useEffect(() => {
        fetchNotifications();
    }, []);

    /* ================= SOCKET REAL-TIME ================= */
    useEffect(() => {
        socket.on("notification:new", (payload) => {
            console.log("🔔 SOCKET RECEIVED:", payload);

            fetchNotifications();

            // 🔊 SOUND (browser allows after user interaction)
            try {
                new Audio("/sounds/notify.mp3").play();
            } catch { }

            // 🍞 TOAST
            toast.success(payload?.title || "New notification");
        });

        return () => socket.off("notification:new");
    }, []);

    /* ================= CLOSE ON OUTSIDE CLICK ================= */
    useEffect(() => {
        const handleClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    /* ================= OPEN NOTIFICATION ================= */
    const openNotification = async (n) => {
        try {
            await api.patch(`/notifications/${n._id}/read`);

            if (n.data?.invoiceId) {
                navigate(`/billing/${n.data.invoiceId}`);
            }

            setOpen(false);
            fetchNotifications();
        } catch {
            console.error("Open notification failed");
        }
    };

    /* ================= MARK ALL READ ================= */
    const markAllAsRead = async () => {
        try {
            await api.patch("/notifications/read-all");
            fetchNotifications();
        } catch {
            console.error("Mark all read failed");
        }
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-30 bg-white border-b shadow-sm">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3">

                {/* ================= LEFT ================= */}
                <div className="flex items-center gap-4">
                    <button
                        className="lg:hidden p-2 rounded-md hover:bg-orange-100"
                        onClick={toggleSidebar}
                    >
                        <Menu size={22} />
                    </button>

                    <div className="flex items-center gap-4">
                        <img
                            src="/logo/sngr.png"
                            className="h-14 w-14 rounded-full border-2 border-[#d4af37]"
                        />
                        <div>
                            <h1 className="text-xl font-extrabold text-[#5a3a1b]">
                                Gangaram Enterprises
                            </h1>
                            <p className="text-xs text-gray-500">
                                Admin Dashboard
                            </p>
                        </div>
                    </div>
                </div>

                {/* ================= RIGHT ================= */}
                <div className="flex items-center gap-4 relative">

                    {/* 🔔 NOTIFICATIONS */}
                    <div ref={dropdownRef} className="relative">
                        <button
                            onClick={() => setOpen(!open)}
                            className="relative hover:text-orange-500"
                        >
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] px-1.5 rounded-full">
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        {/* 🔽 DROPDOWN */}
                        {open && (
                            <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-lg border z-50">
                                <div className="flex items-center justify-between px-4 py-2 border-b">
                                    <span className="font-semibold">
                                        Notifications
                                    </span>
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={markAllAsRead}
                                            className="text-xs text-orange-600 hover:underline"
                                        >
                                            Mark all read
                                        </button>
                                    )}
                                </div>

                                <div className="max-h-96 overflow-y-auto">
                                    {notifications.length === 0 && (
                                        <div className="p-4 text-sm text-gray-500 text-center">
                                            No notifications
                                        </div>
                                    )}

                                    {notifications.map((n) => (
                                        <div
                                            key={n._id}
                                            onClick={() => openNotification(n)}
                                            className={`px-4 py-3 cursor-pointer border-b
                                            ${!n.read
                                                    ? "bg-orange-50"
                                                    : "hover:bg-gray-50"
                                                }`}
                                        >
                                            <div className="font-medium text-sm">
                                                {n.title}
                                            </div>
                                            <div className="text-xs text-gray-600">
                                                {n.body}
                                            </div>
                                            <div className="text-[10px] text-gray-400 mt-1">
                                                {new Date(
                                                    n.createdAt
                                                ).toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* THEME */}
                    <button className="hover:text-orange-500">
                        <Sun size={20} />
                    </button>

                    {/* USER */}
                    <div className="hidden sm:flex items-center gap-3 border-l pl-4">
                        <User size={18} />
                        <span className="text-sm font-semibold">
                            {user?.name || "Admin"}
                        </span>
                        <button
                            onClick={logout}
                            className="px-3 py-1.5 rounded-md text-sm bg-orange-100 text-orange-700 hover:bg-orange-500 hover:text-white"
                        >
                            <LogOut size={16} /> Logout
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
