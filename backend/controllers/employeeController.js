const User = require("../models/User");
const EmployeeLedger = require("../models/EmployeeLedger");
const logger = require("../config/logger");

/* =========================================================
   👥 GET ALL EMPLOYEES (ADMIN ONLY)
========================================================= */
const getEmployees = async (req, res, next) => {
  try {
    const employees = await User.find({ role: "employee" })
      .select("-passwordHash -__v")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees,
    });
  } catch (err) {
    logger.error(`❌ Get employees error: ${err.message}`);
    next(err);
  }
};

/* =========================================================
   ➕ CREATE EMPLOYEE (ADMIN ONLY)
========================================================= */
const createEmployee = async (req, res, next) => {
  try {
    const { name, phone, email, password } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, phone and password required",
      });
    }

    const exists = await User.findOne({ phone });
    if (exists) {
      return res
        .status(409)
        .json({ success: false, message: "Employee already exists" });
    }

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

    res.status(201).json({
      success: true,
      message: "Employee created",
      data: {
        id: employee._id,
        name: employee.name,
        phone: employee.phone,
        employeeCode,
        password, // return once only
      },
    });
  } catch (err) {
    logger.error(`❌ Create employee error: ${err.message}`);
    next(err);
  }
};

/* =========================================================
   💰 ADD LEDGER ENTRY (ADMIN ONLY)
========================================================= */
const addLedgerEntry = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can add ledger entries",
      });
    }

    const { employeeId, type, amount, note = "" } = req.body;

    if (!employeeId || !type || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: "employeeId, type and amount required",
      });
    }

    if (!["credit", "debit"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be credit or debit",
      });
    }

    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a valid number",
      });
    }

    const employee = await User.findById(employeeId);
    if (!employee || employee.role !== "employee") {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const entry = await EmployeeLedger.create({
      employeeId,
      type,
      amount: amt,
      note,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Ledger entry added",
      data: entry,
    });
  } catch (err) {
    logger.error(`❌ Add ledger entry error: ${err.message}`);
    next(err);
  }
};

/* =========================================================
   📊 GET EMPLOYEE LEDGER (ADMIN ONLY)
========================================================= */
const getEmployeeLedger = async (req, res, next) => {
  try {
    const employeeId = req.params.id;

    const employee = await User.findById(employeeId).lean();
    if (!employee || employee.role !== "employee") {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
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
        balance: summary.credit - summary.debit,
      },
      data: ledger,
    });
  } catch (err) {
    logger.error(`❌ Get employee ledger error: ${err.message}`);
    next(err);
  }
};

/* =========================================================
   👤 GET MY LEDGER (EMPLOYEE ONLY)
========================================================= */
const getMyLedger = async (req, res, next) => {
  try {
    const employeeId = req.user._id;

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

    res.status(200).json({
      success: true,
      summary: {
        totalCredit: summary.credit,
        totalDebit: summary.debit,
        balance: summary.credit - summary.debit,
      },
      data: ledger,
    });
  } catch (err) {
    logger.error(`❌ Get my ledger error: ${err.message}`);
    next(err);
  }
};

/* =========================================================
   ✏️ EDIT LEDGER ENTRY (ADMIN ONLY)
========================================================= */
const updateLedgerEntry = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can edit ledger entries",
      });
    }

    const { id } = req.params;
    const { type, amount, note } = req.body;

    const entry = await EmployeeLedger.findById(id);
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Ledger entry not found",
      });
    }

    if (type && ["credit", "debit"].includes(type)) entry.type = type;
    if (amount !== undefined) entry.amount = Number(amount) || entry.amount;
    if (note !== undefined) entry.note = note;

    await entry.save();

    res.json({
      success: true,
      message: "Ledger entry updated",
      data: entry,
    });
  } catch (err) {
    logger.error(`❌ Update ledger entry error: ${err.message}`);
    next(err);
  }
};

/* =========================================================
   ❌ DELETE LEDGER ENTRY (ADMIN ONLY)
========================================================= */
const removeLedgerEntry = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can delete ledger entries",
      });
    }

    const entry = await EmployeeLedger.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Ledger entry not found",
      });
    }

    await entry.deleteOne();

    res.json({
      success: true,
      message: "Ledger entry deleted",
    });
  } catch (err) {
    logger.error(`❌ Delete ledger entry error: ${err.message}`);
    next(err);
  }
};

/* ========================================================= */
module.exports = {
  getEmployees,
  createEmployee,
  addLedgerEntry,
  getEmployeeLedger,
  getMyLedger,
  updateLedgerEntry,
  removeLedgerEntry,
};
