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
    MoreVertical
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Input, Label } from "../components/ui/Input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/Table";
import Badge from "../components/ui/Badge";

/* -------------------------------------------------------------------------- */
/* CONTEXT MENU (RIGHT CLICK / ACTION MENU)                                   */
/* -------------------------------------------------------------------------- */
function ContextMenu({ x, y, onEdit, onDelete }) {
    return (
        <div
            className="fixed bg-white border shadow-xl rounded-lg w-40 py-2 z-50 animate-in fade-in zoom-in duration-200"
            style={{ top: y, left: x }}
            onClick={(e) => e.stopPropagation()}
        >
            <button
                onClick={onEdit}
                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-slate-50 text-sm font-medium text-slate-700"
            >
                <Edit size={16} className="text-slate-400" /> Edit
            </button>

            <button
                onClick={onDelete}
                className="w-full px-4 py-2 flex items-center gap-3 hover:bg-rose-50 text-sm font-medium text-rose-600"
            >
                <Trash2 size={16} className="text-rose-400" /> Delete
            </button>
        </div>
    );
}

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
        <div className="space-y-6">
            <Toaster />

            {/* HEADER */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Employee Management</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage staff, roles, and access credentials.</p>
                </div>

                <Button
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
                    icon={UserPlus}
                >
                    Add Employee
                </Button>
            </div>

            {/* SEARCH & FILTERS */}
            <Card>
                <CardContent className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Search by name, code, or role..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-slate-50 border-slate-200"
                        />
                    </div>

                    <div className="w-full md:w-48">
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer"
                        >
                            <option value="all">All Roles</option>
                            <option value="admin">Admin</option>
                            <option value="employee">Employee</option>
                        </select>
                    </div>
                </CardContent>
            </Card>

            {/* TABLE */}
            <Card>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[120px]">Emp Code</TableHead>
                                <TableHead>Employee Name</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Contact Info</TableHead>
                                <TableHead className="text-right sticky right-0 bg-slate-50/90 backdrop-blur z-20 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.02)] border-l border-slate-100">Actions</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {filtered.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan="5" className="h-32 text-center text-slate-500">
                                        No employees found matching your criteria.
                                    </TableCell>
                                </TableRow>
                            )}

                            {filtered.map((emp) => (
                                <TableRow
                                    key={emp._id}
                                    onClick={() => navigate(`/employees/${emp._id}`)}
                                    onContextMenu={(e) => openContextMenu(e, emp)}
                                    className="cursor-pointer group"
                                >
                                    <TableCell className="font-medium text-slate-700">
                                        {emp.employeeCode}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold">
                                                {emp.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-semibold text-slate-900">{emp.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={emp.role === "admin" ? "primary" : "default"}>
                                            {emp.role.charAt(0).toUpperCase() + emp.role.slice(1)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-slate-600">
                                        {emp.phone}
                                    </TableCell>
                                    <TableCell className="text-right sticky right-0 bg-white group-hover:bg-slate-50/80 z-10 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.05)] border-l border-slate-100">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity p-1 h-8"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                openContextMenu({ preventDefault: () => { }, pageX: rect.left - 120, pageY: rect.bottom + 5 }, emp);
                                            }}
                                        >
                                            <MoreVertical size={16} />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* RIGHT CLICK CONTEXT MENU */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onEdit={() => {
                        setEditData(contextMenu.emp);
                        setForm(contextMenu.emp);
                        setShowModal(true);
                        setContextMenu(null);
                    }}
                    onDelete={() => {
                        handleDelete(contextMenu.emp._id);
                        setContextMenu(null);
                    }}
                />
            )}

            {/* ADD / EDIT MODAL */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <Card className="w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <CardHeader className="flex flex-row items-center justify-between pb-4">
                            <CardTitle>{editData ? "Edit Employee" : "Add New Employee"}</CardTitle>
                            <Button variant="ghost" size="sm" onClick={() => setShowModal(false)} className="h-8 w-8 p-0 rounded-full">
                                <X className="h-4 w-4" />
                            </Button>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <div>
                                <Label>Select Role</Label>
                                <select
                                    value={form.role}
                                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer"
                                >
                                    <option value="" disabled>Select Role...</option>
                                    <option value="employee">Employee</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            <div>
                                <Label>Full Name</Label>
                                <Input
                                    type="text"
                                    placeholder="e.g. John Doe"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <Label>Phone Number</Label>
                                <Input
                                    type="text"
                                    placeholder="e.g. 9876543210"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                />
                            </div>

                            <div>
                                <Label>Email Address (optional)</Label>
                                <Input
                                    type="email"
                                    placeholder="e.g. john@example.com"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                />
                            </div>

                            {!editData && (
                                <div>
                                    <Label>Password</Label>
                                    <Input
                                        type="text"
                                        placeholder="Set a default password"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    />
                                </div>
                            )}

                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                                <Button variant="secondary" onClick={() => setShowModal(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSave} icon={Save}>
                                    {editData ? "Update Employee" : "Create Employee"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* CREATED POPUP */}
            {showCreatedPopup && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <Card className="w-full max-w-sm shadow-xl animate-in zoom-in duration-200">
                        <CardHeader>
                            <CardTitle className="text-emerald-600">Employee Created Successfully</CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 font-mono text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Code:</span>
                                    <span className="font-bold text-slate-900">{showCreatedPopup.code}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Password:</span>
                                    <span className="font-bold text-slate-900">{showCreatedPopup.password}</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 text-center">
                                Please share these credentials securely with the employee.
                            </p>

                            <Button className="w-full" onClick={() => setShowCreatedPopup(null)}>
                                Done
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
