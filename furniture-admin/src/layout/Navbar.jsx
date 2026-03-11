import { Bell, LogOut, Menu, Sun, User, Search } from "lucide-react";
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

    /* ================= GLOBAL SEARCH ================= */
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const searchDropdownRef = useRef(null);

    // Debounced search effect
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults(null);
            setIsSearching(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                // Fetch basic entities to search against
                const [ordersRes, invoicesRes, productsRes, employeesRes] = await Promise.all([
                    api.get("/orders"),
                    api.get("/invoices"),
                    api.get("/products"),
                    api.get("/employees")
                ]);

                const q = searchQuery.toLowerCase();

                // Orders matching
                const matchingOrders = (ordersRes.data.data || []).filter(o => 
                    o.orderId?.toLowerCase().includes(q) || 
                    o.customerName?.toLowerCase().includes(q) || 
                    o.customerPhone?.includes(q)
                ).slice(0, 5);

                // Invoices matching
                const matchingInvoices = (invoicesRes.data.data || []).filter(inv => 
                    inv.invoiceNumber?.toLowerCase().includes(q) || 
                    inv.customerName?.toLowerCase().includes(q) || 
                    inv.customerPhone?.includes(q)
                ).slice(0, 5);

                // Products matching
                const matchingProducts = (productsRes.data.data || []).filter(p => 
                    p.name?.toLowerCase().includes(q) || 
                    p.brand?.toLowerCase().includes(q) ||
                    p.category?.toLowerCase().includes(q)
                ).slice(0, 5);

                // Employees matching
                const matchingEmployees = (employeesRes.data.data || []).filter(e => 
                    e.name?.toLowerCase().includes(q) || 
                    e.phone?.includes(q) || 
                    e.role?.toLowerCase().includes(q) ||
                    e.employeeId?.toLowerCase().includes(q)
                ).slice(0, 5);

                // Derived customers (unique from orders + invoices)
                const customersMap = new Map();
                (ordersRes.data.data || []).forEach(o => {
                    if (o.customerName?.toLowerCase().includes(q) || o.customerPhone?.includes(q)) {
                        customersMap.set(o.customerPhone, { name: o.customerName, phone: o.customerPhone, type: 'order', id: o._id });
                    }
                });
                (invoicesRes.data.data || []).forEach(inv => {
                    if (inv.customerName?.toLowerCase().includes(q) || inv.customerPhone?.includes(q)) {
                        customersMap.set(inv.customerPhone, { name: inv.customerName, phone: inv.customerPhone, type: 'invoice', id: inv._id });
                    }
                });
                const matchingCustomers = Array.from(customersMap.values()).slice(0, 5);

                setSearchResults({
                    orders: matchingOrders,
                    invoices: matchingInvoices,
                    products: matchingProducts,
                    employees: matchingEmployees,
                    customers: matchingCustomers
                });
                setShowSearchDropdown(true);
            } catch (err) {
                console.error("Search failed:", err);
            } finally {
                setIsSearching(false);
            }
        }, 400); // 400ms debounce

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Close search on click outside
    useEffect(() => {
        const handleClick = (e) => {
            if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target)) {
                setShowSearchDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const hasResults = searchResults && (
        searchResults.orders.length > 0 ||
        searchResults.invoices.length > 0 ||
        searchResults.products.length > 0 ||
        searchResults.employees.length > 0 ||
        searchResults.customers.length > 0
    );

    return (
        <header className="fixed top-0 left-0 lg:left-64 right-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition-all duration-300">
            <div className="flex h-full items-center justify-between px-4 sm:px-6">

                {/* ================= LEFT & SEARCH ================= */}
                <div className="flex items-center gap-4 flex-1">
                    <button
                        className="p-2 -ml-2 rounded-md text-slate-500 hover:bg-slate-100 transition-colors"
                        onClick={toggleSidebar}
                    >
                        <Menu size={22} />
                    </button>

                    {/* Search Bar matching Lector styling */}
                    <div className="hidden md:flex relative items-center max-w-xl w-full ml-2" ref={searchDropdownRef}>
                        <Search className="absolute left-4 text-slate-400 w-4 h-4 z-10" />
                        <input
                            type="text"
                            placeholder="Search orders, invoices, products, customers..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (!showSearchDropdown && e.target.value.trim().length > 0) setShowSearchDropdown(true);
                            }}
                            onFocus={() => {
                                if (searchQuery.trim().length > 0) setShowSearchDropdown(true);
                            }}
                            className="bg-slate-50 hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-primary-300 rounded-xl pl-11 pr-4 py-2.5 text-[13px] font-medium w-full lg:w-96 xl:w-[28rem] outline-none transition-all duration-200 text-slate-700 placeholder:text-slate-400 shadow-sm"
                        />
                        
                        {/* SEARCH DROPDOWN */}
                        {showSearchDropdown && searchQuery.trim() && (
                            <div className="absolute top-full left-0 mt-2 w-full lg:w-[32rem] max-h-[70vh] overflow-y-auto bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 z-50 custom-scrollbar flex flex-col">
                                {isSearching ? (
                                    <div className="p-4 text-center text-sm font-medium text-slate-500 flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-slate-300 border-t-primary rounded-full animate-spin"></div>
                                        Searching databases...
                                    </div>
                                ) : !hasResults ? (
                                    <div className="p-6 text-center text-sm text-slate-500 flex flex-col items-center">
                                        <Search className="w-8 h-8 text-slate-300 mb-2" />
                                        No results found for "{searchQuery}"
                                    </div>
                                ) : (
                                    <div className="py-2">
                                        {/* CUSTOMERS */}
                                        {searchResults.customers?.length > 0 && (
                                            <div className="mb-2">
                                                <div className="px-4 py-1.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase bg-slate-50/50">Customers</div>
                                                {searchResults.customers.map((c, i) => (
                                                    <div key={`cust-${i}`} onClick={() => { setShowSearchDropdown(false); navigate(c.type === 'order' ? `/orders/${c.id}` : `/billing/${c.id}`); }} className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0">
                                                        <div className="font-medium text-sm text-slate-800">{c.name || 'Unknown Customer'}</div>
                                                        <div className="text-xs text-slate-500">{c.phone}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {/* ORDERS */}
                                        {searchResults.orders?.length > 0 && (
                                            <div className="mb-2">
                                                <div className="px-4 py-1.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase bg-slate-50/50">Orders</div>
                                                {searchResults.orders.map(o => (
                                                    <div key={o._id} onClick={() => { setShowSearchDropdown(false); navigate(`/orders/${o._id}`); }} className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0 flex justify-between items-center">
                                                        <div>
                                                            <div className="font-medium text-sm text-primary-600">{o.orderId}</div>
                                                            <div className="text-xs text-slate-600">{o.customerName} {o.customerPhone ? `(${o.customerPhone})` : ''}</div>
                                                        </div>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                                            o.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' :
                                                            o.status === 'PRODUCTION' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-blue-100 text-blue-700'
                                                        }`}>{o.status}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* INVOICES */}
                                        {searchResults.invoices?.length > 0 && (
                                            <div className="mb-2">
                                                <div className="px-4 py-1.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase bg-slate-50/50">Invoices</div>
                                                {searchResults.invoices.map(inv => (
                                                    <div key={inv._id} onClick={() => { setShowSearchDropdown(false); navigate(`/billing/${inv._id}`); }} className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0 flex justify-between items-center">
                                                        <div>
                                                            <div className="font-medium text-sm text-purple-600">{inv.invoiceNumber}</div>
                                                            <div className="text-xs text-slate-600">{inv.customerName}</div>
                                                        </div>
                                                        <span className="text-xs font-semibold text-slate-700">₹{inv.totalAmount?.toLocaleString('en-IN') || 0}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* PRODUCTS */}
                                        {searchResults.products?.length > 0 && (
                                            <div className="mb-2">
                                                <div className="px-4 py-1.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase bg-slate-50/50">Products</div>
                                                {searchResults.products.map(p => (
                                                    <div key={p._id} onClick={() => { setShowSearchDropdown(false); navigate(`/products`); }} className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0 flex justify-between items-center">
                                                        <div>
                                                            <div className="font-medium text-sm text-slate-800">{p.name}</div>
                                                            <div className="text-xs text-slate-500">{p.brand || 'No Brand'} • Stock: {p.stockQty}</div>
                                                        </div>
                                                        <span className="text-xs font-semibold text-emerald-600">₹{(p.sellPrice || p.salePrice || p.price)?.toLocaleString('en-IN') || 0}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* EMPLOYEES */}
                                        {searchResults.employees?.length > 0 && (
                                            <div>
                                                <div className="px-4 py-1.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase bg-slate-50/50">Employees</div>
                                                {searchResults.employees.map(emp => (
                                                    <div key={emp._id} onClick={() => { setShowSearchDropdown(false); navigate(`/employees`); }} className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0">
                                                        <div className="font-medium text-sm text-slate-800">{emp.name}</div>
                                                        <div className="text-xs text-slate-500">{emp.role || 'Staff'} • {emp.phone}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ================= RIGHT ================= */}
                <div className="flex items-center gap-3 sm:gap-5 relative">

                    {/* 🔔 NOTIFICATIONS */}
                    <div ref={dropdownRef} className="relative mt-1">
                        <button
                            onClick={() => setOpen(!open)}
                            className="relative p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-primary-600 transition-colors"
                        >
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                </span>
                            )}
                        </button>

                        {/* 🔽 DROPDOWN */}
                        {
                            open && (
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-glass border border-slate-100 overflow-hidden z-50 transform origin-top-right transition-all">
                                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 border-b border-slate-100">
                                        <span className="font-semibold text-sm text-slate-800">
                                            Notifications
                                            {unreadCount > 0 && <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 text-xs">{unreadCount}</span>}
                                        </span>
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={markAllAsRead}
                                                className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline"
                                            >
                                                Mark all read
                                            </button>
                                        )}
                                    </div>

                                    <div className="max-h-80 overflow-y-auto">
                                        {notifications.length === 0 && (
                                            <div className="p-8 text-sm text-slate-500 text-center flex flex-col items-center">
                                                <Bell className="h-8 w-8 text-slate-300 mb-2" />
                                                No new notifications
                                            </div>
                                        )}

                                        {notifications.map((n) => (
                                            <div
                                                key={n._id}
                                                onClick={() => openNotification(n)}
                                                className={`px-4 py-3 cursor-pointer border-b border-slate-50 last:border-0 transition-colors
                                            ${!n.read
                                                        ? "bg-primary-50/50 hover:bg-primary-50"
                                                        : "hover:bg-slate-50"
                                                    }`}
                                            >
                                                <div className="font-medium text-sm text-slate-800">
                                                    {n.title}
                                                </div>
                                                <div className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                                                    {n.body}
                                                </div>
                                                <div className="text-[10px] font-medium text-slate-400 mt-2">
                                                    {new Date(n.createdAt).toLocaleString(undefined, {
                                                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        }
                    </div >

                    {/* USER */}
                    < div className="hidden sm:flex items-center gap-4 pl-4 border-l border-slate-200" >
                        <div className="flex flex-col items-end">
                            <span className="text-sm font-semibold text-slate-800 leading-tight">
                                {user?.name || "Admin"}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                                {user?.role === 'admin' ? 'Administrator' : 'Staff'}
                            </span>
                        </div>
                        <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold border border-primary-200">
                            {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
                        </div>
                        <button
                            onClick={logout}
                            title="Log out"
                            className="p-2 ml-1 rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                            <LogOut size={18} />
                        </button>
                    </div >
                </div >
            </div >
        </header >
    );
}
