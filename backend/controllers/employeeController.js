const employeeService = require("../services/employeeService");
const logger = require("../config/logger");

/* =========================================================
   👥 GET ALL EMPLOYEES (ADMIN ONLY)
========================================================= */
const getEmployees = async (req, res, next) => {
  try {
    const employees = await employeeService.getEmployees();

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
    const { name, phone, password } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, phone and password required",
      });
    }

    const result = await employeeService.createEmployee(req.user._id, req.body);

    if (result.error) {
      return res
        .status(result.status)
        .json({ success: false, message: result.error });
    }

    res.status(201).json({
      success: true,
      message: "Employee created",
      data: result,
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

    const { employeeId, type, amount } = req.body;

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

    const result = await employeeService.addLedgerEntry(req.user._id, req.body);
    if (result.error) {
      return res
        .status(result.status)
        .json({ success: false, message: result.error });
    }

    res.status(201).json({
      success: true,
      message: "Ledger entry added",
      data: result,
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
    const result = await employeeService.getEmployeeLedger(req.params.id);

    if (result.error) {
      return res
        .status(result.status)
        .json({ success: false, message: result.error });
    }

    res.status(200).json({
      success: true,
      ...result,
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
    const result = await employeeService.getMyLedger(req.user._id);

    res.status(200).json({
      success: true,
      ...result,
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

    const result = await employeeService.updateLedgerEntry(req.params.id, req.body);
    if (result.error) {
      return res
        .status(result.status)
        .json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: "Ledger entry updated",
      data: result,
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

    const result = await employeeService.removeLedgerEntry(req.params.id);
    if (result.error) {
      return res
        .status(result.status)
        .json({ success: false, message: result.error });
    }

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
