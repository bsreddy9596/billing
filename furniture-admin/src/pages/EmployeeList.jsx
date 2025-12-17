// src/pages/EmployeeList.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import toast, { Toaster } from "react-hot-toast";
import {
    UserPlus,
    Edit,
    Trash2,
    Search,
    User2,
    X,
    Save,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* CUSTOM SELECT DROPDOWN                                                     */
/* -------------------------------------------------------------------------- */
function CustomSelect({ value, onChange, options, placeholder = "Select" }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative w-full text-sm">
            <div
                onClick={() => setOpen(!open)}
                className="w-full border px-3 py-1.5 rounded-lg bg-white cursor-pointer flex justify-between items-center"
            >
                <span>{value ? options.find((o) => o.value === value)?.label : placeholder}</span>
                <span className="text-gray-500">▼</span>
            </div>

            {open && (
                <div className="absolute w-full bg-white border rounded-lg mt-1 shadow-lg z-50 text-sm">
                    {options.map((opt) => (
                        <div
                            key={opt.value}
                            onClick={() => {
                                onChange(opt.value);
                                setOpen(false);
                            }}
                            className="px-3 py-2 cursor-pointer hover:bg-[#00A28E] hover:text-white"
                        >
                            {opt.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* CONTEXT MENU (RIGHT CLICK)                                                 */
/* -------------------------------------------------------------------------- */
function ContextMenu({ x, y, onEdit, onDelete }) {
    return (
        <div
            className="fixed bg-white border shadow-xl rounded-lg w-40 py-2 z-50 animate-[fadeIn_.15s_ease-out]"
            style={{ top: y, left: x }}
        >
            <button
                onClick={onEdit}
                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-100"
            >
                <Edit size={16} /> Edit
            </button>

            <button
                onClick={onDelete}
                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-red-100 text-red-600"
            >
                <Trash2 size={16} /> Delete
            </button>
        </div>
    );
}

// animation
const style = document.createElement("style");
style.innerHTML = `
@keyframes fadeIn {
  0% { opacity:0; transform:scale(.92); }
  100% { opacity:1; transform:scale(1); }
}`;
document.head.appendChild(style);

/* -------------------------------------------------------------------------- */
/* MAIN PAGE                                                                  */
/* -------------------------------------------------------------------------- */
export default function EmployeeList() {
    const [employees, setEmployees] = useState([]);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [loading, setLoading] = useState(true);

    const [contextMenu, setContextMenu] = useState(null);

    const [showModal, setShowModal] = useState(false);
    const [editData, setEditData] = useState(null);
    const [showCreatedPopup, setShowCreatedPopup] = useState(null);

    const [form, setForm] = useState({
        name: "",
        role: "",
        salary: "",
        status: "active",
        phone: "",
        email: "",
        password: "",
    });

    const navigate = useNavigate();

    /* LOAD EMPLOYEES */
    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const res = await api.get("/auth/employees");
            setEmployees(res.data.data);
        } catch {
            toast.error("Failed to fetch employees");
        } finally {
            setLoading(false);
        }
    };

    /* RIGHT CLICK MENU */
    const openContextMenu = (e, emp) => {
        e.preventDefault();
        setContextMenu({ emp, x: e.pageX, y: e.pageY });
    };

    useEffect(() => {
        const close = () => setContextMenu(null);
        window.addEventListener("click", close);
        return () => window.removeEventListener("click", close);
    }, []);

    /* SAVE EMPLOYEE (ADD / UPDATE) */
    const handleSave = async () => {
        try {
            if (!form.name || !form.phone || (!editData && !form.password))
                return toast.error("Required fields missing");

            if (editData) {
                await api.put(`/auth/employee/${editData._id}`, form);
                toast.success("Employee updated");
            } else {
                const res = await api.post("/auth/employee/add", form);
                setShowCreatedPopup(res.data.data);
                toast.success("Employee added");
            }

            setShowModal(false);
            setEditData(null);
            fetchEmployees();
        } catch {
            toast.error("Failed to save employee");
        }
    };

    /* DELETE EMPLOYEE */
    const handleDelete = async (id) => {
        if (!window.confirm("Delete employee?")) return;
        try {
            await api.delete(`/auth/employee/${id}`);
            toast.success("Deleted");
            fetchEmployees();
        } catch {
            toast.error("Failed to delete");
        }
    };

    /* FILTER EMPLOYEES */
    const filtered = employees.filter((emp) => {
        const s = search.toLowerCase();
        return (
            emp?.name?.toLowerCase().includes(s) ||
            emp?.employeeCode?.toLowerCase().includes(s) ||
            emp?.role?.toLowerCase().includes(s)
        ) && (roleFilter === "all" || emp.role === roleFilter);
    });

    if (loading) return <div className="p-6 text-center">Loading...</div>;

    /* ---------------------------------------------------------------------- */
    /* UI START                                                               */
    /* ---------------------------------------------------------------------- */
    return (
        <div className="p-6 space-y-6 min-h-screen bg-gradient-to-br from-white via-[#F0FFFB] to-[#E6FFF8] text-sm">
            <Toaster />

            {/* HEADER */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-extrabold">👥 Employee Management</h1>

                <button
                    onClick={() => {
                        setEditData(null);
                        setForm({
                            name: "",
                            role: "",
                            salary: "",
                            status: "active",
                            phone: "",
                            email: "",
                            password: "",
                        });
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 bg-[#00BFA6] text-white px-4 py-2 rounded-xl shadow"
                >
                    <UserPlus size={18} /> Add Employee
                </button>
            </div>

            {/* SEARCH */}
            <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow border">
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border w-56">
                    <Search size={16} className="text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-transparent outline-none text-sm"
                    />
                </div>

                <div className="w-40">
                    <CustomSelect
                        value={roleFilter}
                        onChange={setRoleFilter}
                        options={[
                            { label: "All Roles", value: "all" },
                            { label: "Admin", value: "admin" },
                            { label: "Employee", value: "employee" },
                        ]}
                    />
                </div>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-2xl shadow-lg border overflow-x-auto">
                <table className="min-w-full text-gray-700">
                    <thead className="bg-[#D9FFF4] text-gray-800 uppercase font-bold text-[13px] border-b">
                        <tr>
                            <th className="p-3 text-left">EMP CODE</th>
                            <th className="p-3 text-left">NAME</th>
                            <th className="p-3 text-left">ROLE</th>
                            <th className="p-3 text-left">PHONE</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filtered.map((emp) => (
                            <tr
                                key={emp._id}
                                onClick={() => navigate(`/employees/ledger/${emp._id}`)}
                                onContextMenu={(e) => openContextMenu(e, emp)}
                                className="border-b hover:bg-[#F5FFFC] cursor-pointer h-12"
                            >
                                <td className="p-3 font-semibold">{emp.employeeCode}</td>

                                <td className="p-3 flex items-center gap-2 text-[#00A28E] font-semibold">
                                    <User2 size={18} /> {emp.name}
                                </td>

                                <td className="p-3">{emp.role}</td>
                                <td className="p-3">{emp.phone}</td>
                            </tr>
                        ))}

                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan="4" className="text-center py-6 text-gray-500 italic">
                                    No employees found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* RIGHT CLICK CONTEXT MENU */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onEdit={() => {
                        setEditData(contextMenu.emp);
                        setForm(contextMenu.emp);
                        setShowModal(true);
                    }}
                    onDelete={() => handleDelete(contextMenu.emp._id)}
                />
            )}

            {/* ADD / EDIT MODAL */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 relative">
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                        >
                            <X size={22} />
                        </button>

                        <h2 className="text-xl font-bold mb-4">
                            {editData ? "Edit Employee" : "Add Employee"}
                        </h2>

                        <div className="space-y-4 text-sm">
                            <input
                                type="text"
                                placeholder="Employee Name"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full border px-3 py-2 rounded-lg"
                            />

                            <input
                                type="text"
                                placeholder="Phone Number"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                className="w-full border px-3 py-2 rounded-lg"
                            />

                            <input
                                type="email"
                                placeholder="Email (optional)"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="w-full border px-3 py-2 rounded-lg"
                            />

                            {!editData && (
                                <input
                                    type="text"
                                    placeholder="Password"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    className="w-full border px-3 py-2 rounded-lg"
                                />
                            )}

                            <CustomSelect
                                value={form.role}
                                onChange={(v) => setForm({ ...form, role: v })}
                                options={[
                                    { label: "Employee", value: "employee" },
                                    { label: "Admin", value: "admin" },
                                ]}
                                placeholder="Select Role"
                            />

                            <button
                                onClick={handleSave}
                                className="w-full bg-[#00BFA6] text-white flex items-center justify-center gap-2 py-2 rounded-lg shadow"
                            >
                                <Save size={18} />{" "}
                                {editData ? "Update Employee" : "Create Employee"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CREATED POPUP */}
            {showCreatedPopup && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-xl shadow-lg text-sm">
                        <h3 className="font-bold text-lg mb-2">Employee Created</h3>

                        <div className="mt-3 p-3 bg-gray-100 rounded-lg">
                            <p><b>Code:</b> {showCreatedPopup.code}</p>
                            <p><b>Password:</b> {showCreatedPopup.password}</p>
                        </div>

                        <button
                            className="mt-4 bg-[#00BFA6] text-white px-4 py-2 rounded-lg w-full"
                            onClick={() => setShowCreatedPopup(null)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
