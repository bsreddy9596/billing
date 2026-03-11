const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const generateToken = (user) =>
    jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: "15d",
    });

const generateEmployeeCode = () =>
    `EMP${Math.floor(10000 + Math.random() * 90000)}`;

class AuthService {
    async ensureAdminExists(adminPhone, adminEmail, adminName, adminPassword) {
        if (!adminPhone || !adminPassword) return { missing: true };

        let admin = await User.findOne({ phone: adminPhone, role: "admin" });

        if (!admin) {
            const hashed = await bcrypt.hash(adminPassword, 10);
            admin = await User.create({
                name: adminName || "Super Admin",
                email: adminEmail || "admin@example.com",
                phone: adminPhone,
                role: "admin",
                passwordHash: hashed,
                isApproved: true,
            });
            return { created: true, adminPhone };
        }
        return { created: false, adminPhone };
    }

    async adminLogin(phone, password) {
        const user = await User.findOne({ phone, role: "admin" });
        if (!user) return { error: "Admin not found", status: 404 };

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return { error: "Invalid password", status: 401 };

        const token = generateToken(user);
        user.lastLoginAt = new Date();
        await user.save();

        return {
            token,
            role: user.role,
            name: user.name,
            phone: user.phone,
        };
    }

    async addEmployee(adminId, data) {
        const { name, phone, password } = data;

        const existing = await User.findOne({ phone });
        if (existing) return { error: "Phone already registered", status: 400 };

        const hash = await bcrypt.hash(password, 10);
        const employeeCode = generateEmployeeCode();

        const emp = await User.create({
            name,
            phone,
            passwordHash: hash,
            role: "employee",
            employeeCode,
            isApproved: true,
            adminId,
        });

        return {
            id: emp._id,
            name: emp.name,
            phone: emp.phone,
            code: emp.employeeCode,
            password,
        };
    }

    async employeeLogin(employeeCode, password) {
        const user = await User.findOne({ employeeCode, role: "employee" });
        if (!user) return { error: "Invalid credentials", status: 404 };

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return { error: "Invalid password", status: 401 };

        const token = generateToken(user);
        user.lastLoginAt = new Date();
        await user.save();

        return {
            token,
            role: user.role,
            name: user.name,
            phone: user.phone,
        };
    }

    async resetEmployeePassword(userId, newPassword) {
        const user = await User.findById(userId);
        if (!user) return { error: "User not found", status: 404 };

        user.passwordHash = await bcrypt.hash(newPassword, 10);
        await user.save();

        return { phone: user.phone };
    }

    async updateEmployee(empId, data) {
        const employee = await User.findById(empId);

        if (!employee || employee.role !== "employee") {
            return { error: "Employee not found", status: 404 };
        }

        employee.name = data.name ?? employee.name;
        employee.phone = data.phone ?? employee.phone;
        employee.email = data.email ?? employee.email;
        employee.role = data.role ?? employee.role;
        employee.status = data.status ?? employee.status;
        employee.salary = data.salary ?? employee.salary;

        await employee.save();
        return employee;
    }

    async deleteEmployee(empId) {
        const employee = await User.findById(empId);

        if (!employee || employee.role !== "employee") {
            return { error: "Employee not found", status: 404 };
        }

        await User.findByIdAndDelete(empId);
        return { phone: employee.phone };
    }

    async getEmployees() {
        return User.find({ role: "employee" })
            .select("-passwordHash -__v")
            .sort({ createdAt: -1 });
    }
}

module.exports = new AuthService();
