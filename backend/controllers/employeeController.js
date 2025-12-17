const User = require("../models/User");
const EmployeeLedger = require("../models/EmployeeLedger");
const logger = require("../config/logger");

/* -------------------------------------------------------------------------- */
/* 🧾 Get All Employees (Admin Only)                                          */
/* -------------------------------------------------------------------------- */
const getEmployees = async (req, res, next) => {
  try {
    const employees = await User.find({ role: "employee" })
      .select("-passwordHash -__v")
      .sort({ createdAt: -1 })
      .lean();

    logger.info(`👥 Employees fetched by Admin: ${req.user._id}`);

    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees,
    });
  } catch (err) {
    logger.error(`❌ Error fetching employees: ${err.message}`);
    next(err);
  }
};

/* -------------------------------------------------------------------------- */
/* ➕ Create Employee (Admin Only)                                            */
/* -------------------------------------------------------------------------- */
const createEmployee = async (req, res, next) => {
  try {
    const { name, phone, email, password } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, phone, and password required",
      });
    }

    const exists = await User.findOne({ phone });
    if (exists) {
      return res
        .status(409)
        .json({ success: false, message: "Employee already exists" });
    }

    // Generate employee code
    const employeeCode = `EMP${Math.floor(10000 + Math.random() * 90000)}`;

    const employee = new User({
      name,
      email,
      phone,
      role: "employee",
      isApproved: true,
      employeeCode,
      adminId: req.user._id,
    });

    await employee.setPassword(password);
    await employee.save();

    logger.info(`✅ Employee created: ${employee.phone}`);

    res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: {
        id: employee._id,
        name: employee.name,
        phone: employee.phone,
        code: employee.employeeCode,
        password, // return once
      },
    });
  } catch (err) {
    logger.error(`❌ Create employee error: ${err.message}`);
    next(err);
  }
};

/* -------------------------------------------------------------------------- */
/* 💰 Add Ledger Entry                                                        */
/* -------------------------------------------------------------------------- */
const addLedgerEntry = async (req, res, next) => {
  try {
    const { employeeId, type, amount, note } = req.body;

    if (!employeeId || !type || !amount) {
      return res.status(400).json({
        success: false,
        message: "employeeId, type & amount required",
      });
    }

    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const entry = await EmployeeLedger.create({
      employeeId,
      type,
      amount,
      note: note || "",
      createdBy: req.user._id,
    });

    logger.info(`💰 Ledger entry added for employee: ${employee.phone}`);

    res.status(201).json({
      success: true,
      message: "Ledger entry added successfully",
      data: entry,
    });
  } catch (err) {
    logger.error(`❌ Add ledger entry error: ${err.message}`);
    next(err);
  }
};

/* -------------------------------------------------------------------------- */
/* 📊 Get Employee Ledger                                                     */
/* -------------------------------------------------------------------------- */
const getEmployeeLedger = async (req, res, next) => {
  try {
    const employeeId = req.params.id;

    const employee = await User.findById(employeeId).lean();
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const ledger = await EmployeeLedger.find({ employeeId })
      .sort({ createdAt: -1 })
      .lean();

    const summary = ledger.reduce(
      (acc, entry) => {
        if (entry.type === "credit") acc.credit += entry.amount;
        if (entry.type === "debit") acc.debit += entry.amount;
        return acc;
      },
      { credit: 0, debit: 0 }
    );

    const balance = summary.credit - summary.debit;

    res.status(200).json({
      success: true,
      employee: {
        id: employee._id,
        name: employee.name,
        phone: employee.phone,
        employeeCode: employee.employeeCode,
      },
      summary: {
        totalCredit: summary.credit,
        totalDebit: summary.debit,
        balance,
      },
      data: ledger,
    });
  } catch (err) {
    logger.error(`❌ Get employee ledger error: ${err.message}`);
    next(err);
  }
};

/* -------------------------------------------------------------------------- */
/* ❌ Delete Employee                                                         */
/* -------------------------------------------------------------------------- */
const deleteEmployee = async (req, res, next) => {
  try {
    const employee = await User.findById(req.params.id);

    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    if (employee.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin cannot be deleted",
      });
    }

    await EmployeeLedger.deleteMany({ employeeId: employee._id });
    await User.findByIdAndDelete(employee._id);

    logger.warn(`🗑️ Employee deleted: ${employee.phone}`);

    res.status(200).json({
      success: true,
      message: `Employee ${employee.name} deleted successfully`,
    });
  } catch (err) {
    logger.error(`❌ Delete employee error: ${err.message}`);
    next(err);
  }
};

/* -------------------------------------------------------------------------- */
/* ✏️ Edit Ledger Entry (Admin Only)                                          */
/* -------------------------------------------------------------------------- */
const updateLedgerEntry = async (req, res, next) => {
  try {
    const { id } = req.params; // ledger entry ID
    const { type, amount, note } = req.body;

    const entry = await EmployeeLedger.findById(id);
    if (!entry)
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });

    entry.type = type || entry.type;
    entry.amount = amount || entry.amount;
    entry.note = note || entry.note;

    await entry.save();

    res.status(200).json({
      success: true,
      message: "Ledger entry updated",
      data: entry,
    });
  } catch (err) {
    next(err);
  }
};

/* -------------------------------------------------------------------------- */
/* ❌ Delete Ledger Entry (Admin Only)                                        */
/* -------------------------------------------------------------------------- */
const removeLedgerEntry = async (req, res, next) => {
  try {
    const { id } = req.params; // ledger entry ID

    const entry = await EmployeeLedger.findById(id);
    if (!entry)
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });

    await entry.deleteOne();

    res.status(200).json({
      success: true,
      message: "Ledger entry deleted",
    });
  } catch (err) {
    next(err);
  }
};
/* -------------------------------------------------------------------------- */
/* 👤 Get My Ledger (Employee Only)                                           */
/* -------------------------------------------------------------------------- */
const getMyLedger = async (req, res, next) => {
  try {
    const employeeId = req.user._id;

    const employee = await User.findById(employeeId).lean();
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const ledger = await EmployeeLedger.find({ employeeId })
      .sort({ createdAt: -1 })
      .lean();

    const summary = ledger.reduce(
      (acc, entry) => {
        if (entry.type === "credit") acc.credit += entry.amount;
        if (entry.type === "debit") acc.debit += entry.amount;
        return acc;
      },
      { credit: 0, debit: 0 }
    );

    const balance = summary.credit - summary.debit;

    res.status(200).json({
      success: true,
      employee: {
        id: employee._id,
        name: employee.name,
        phone: employee.phone,
        employeeCode: employee.employeeCode,
      },
      summary: {
        totalCredit: summary.credit,
        totalDebit: summary.debit,
        balance,
      },
      data: ledger,
    });
  } catch (err) {
    logger.error(`❌ Get my ledger error: ${err.message}`);
    next(err);
  }
};

/* -------------------------------------------------------------------------- */
module.exports = {
  getEmployees,
  createEmployee,
  addLedgerEntry,
  getEmployeeLedger,
  deleteEmployee,
  updateLedgerEntry,
  removeLedgerEntry,
  getMyLedger,
};
