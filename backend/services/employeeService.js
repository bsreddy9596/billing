const User = require("../models/User");
const EmployeeLedger = require("../models/EmployeeLedger");

class EmployeeService {
    async getEmployees() {
        return User.find({ role: "employee" })
            .select("-passwordHash -__v")
            .sort({ createdAt: -1 })
            .lean();
    }

    async createEmployee(adminId, data) {
        const { name, phone, email, password } = data;

        const exists = await User.findOne({ phone });
        if (exists) {
            return { error: "Employee already exists", status: 409 };
        }

        const employeeCode = `EMP${Math.floor(10000 + Math.random() * 90000)}`;

        const employee = new User({
            name,
            email,
            phone,
            role: "employee",
            isApproved: true,
            employeeCode,
            adminId,
        });

        await employee.setPassword(password);
        await employee.save();

        return {
            id: employee._id,
            name: employee.name,
            phone: employee.phone,
            employeeCode,
            password,
        };
    }

    async addLedgerEntry(adminId, data) {
        const { employeeId, type, amount, note = "" } = data;

        const amt = Number(amount);
        if (isNaN(amt) || amt <= 0) {
            return { error: "Amount must be a valid number", status: 400 };
        }

        const employee = await User.findById(employeeId);
        if (!employee || employee.role !== "employee") {
            return { error: "Employee not found", status: 404 };
        }

        const entry = await EmployeeLedger.create({
            employeeId,
            type,
            amount: amt,
            note,
            createdBy: adminId,
        });

        return entry;
    }

    async getEmployeeLedger(employeeId) {
        const employee = await User.findById(employeeId).lean();
        if (!employee || employee.role !== "employee") {
            return { error: "Employee not found", status: 404 };
        }

        const ledger = await EmployeeLedger.find({ employeeId })
            .sort({ createdAt: -1 })
            .lean();

        const summary = ledger.reduce(
            (acc, e) => {
                if (e.type === "credit") acc.credit += e.amount;
                if (e.type === "debit") acc.debit += e.amount;
                return acc;
            },
            { credit: 0, debit: 0 }
        );

        return {
            employee: {
                id: employee._id,
                name: employee.name,
                phone: employee.phone,
                employeeCode: employee.employeeCode,
            },
            summary: {
                totalCredit: summary.credit,
                totalDebit: summary.debit,
                balance: summary.credit - summary.debit,
            },
            data: ledger,
        };
    }

    async getMyLedger(employeeId) {
        const ledger = await EmployeeLedger.find({ employeeId })
            .sort({ createdAt: -1 })
            .lean();

        const summary = ledger.reduce(
            (acc, e) => {
                if (e.type === "credit") acc.credit += e.amount;
                if (e.type === "debit") acc.debit += e.amount;
                return acc;
            },
            { credit: 0, debit: 0 }
        );

        return {
            summary: {
                totalCredit: summary.credit,
                totalDebit: summary.debit,
                balance: summary.credit - summary.debit,
            },
            data: ledger,
        };
    }

    async updateLedgerEntry(entryId, data) {
        const { type, amount, note } = data;

        const entry = await EmployeeLedger.findById(entryId);
        if (!entry) {
            return { error: "Ledger entry not found", status: 404 };
        }

        if (type && ["credit", "debit"].includes(type)) entry.type = type;
        if (amount !== undefined) entry.amount = Number(amount) || entry.amount;
        if (note !== undefined) entry.note = note;

        await entry.save();
        return entry;
    }

    async removeLedgerEntry(entryId) {
        const entry = await EmployeeLedger.findById(entryId);
        if (!entry) {
            return { error: "Ledger entry not found", status: 404 };
        }

        await entry.deleteOne();
        return true;
    }
}

module.exports = new EmployeeService();
