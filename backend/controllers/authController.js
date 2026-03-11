const authService = require("../services/authService");
const logger = require("../config/logger");

/* -------------------------------------------------------------------------- */
/* 👑 Auto-create Single Admin                                                */
/* -------------------------------------------------------------------------- */
const ensureAdminExists = async () => {
  try {
    const { ADMIN_PHONE, ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD } =
      process.env;

    const result = await authService.ensureAdminExists(
      ADMIN_PHONE,
      ADMIN_EMAIL,
      ADMIN_NAME,
      ADMIN_PASSWORD
    );

    if (result?.missing) {
      logger.warn("⚠️ ADMIN_PHONE or ADMIN_PASSWORD missing in .env");
    } else if (result?.created) {
      logger.info(`✅ Default Admin created (${result.adminPhone})`);
    } else if (result) {
      logger.info("Admin already exists");
    }
  } catch (err) {
    logger.error(`❌ Admin creation failed: ${err.message}`);
  }
};

/* -------------------------------------------------------------------------- */
/* 👨‍💼 Admin Login                                                           */
/* -------------------------------------------------------------------------- */
const adminLogin = async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password)
      return res
        .status(400)
        .json({ success: false, message: "Phone & password required" });

    const result = await authService.adminLogin(phone, password);
    if (result.error) {
      return res
        .status(result.status)
        .json({ success: false, message: result.error });
    }

    logger.info(`👑 Admin login success (${phone})`);

    res.json({
      success: true,
      token: result.token,
      role: result.role,
      name: result.name,
      phone: result.phone,
    });
  } catch (err) {
    logger.error(`❌ Admin Login Error: ${err.message}`);
    next(err);
  }
};

/* -------------------------------------------------------------------------- */
/* 👷 Add New Employee (Admin Only)                                           */
/* -------------------------------------------------------------------------- */
const addEmployee = async (req, res, next) => {
  try {
    const { name, phone, password } = req.body;

    if (!name || !phone || !password)
      return res
        .status(400)
        .json({ success: false, message: "All fields required" });

    const result = await authService.addEmployee(req.user._id, req.body);
    if (result.error) {
      return res
        .status(result.status)
        .json({ success: false, message: result.error });
    }

    logger.info(`✅ Employee created by admin: ${name} (${phone})`);

    res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: result,
    });
  } catch (err) {
    logger.error(`❌ Add Employee Error: ${err.message}`);
    next(err);
  }
};

/* -------------------------------------------------------------------------- */
/* 👷 Employee Login (Code + Password)                                        */
/* -------------------------------------------------------------------------- */
const employeeLogin = async (req, res, next) => {
  try {
    const { employeeCode, password } = req.body;

    if (!employeeCode || !password)
      return res
        .status(400)
        .json({ success: false, message: "Code & password required" });

    const result = await authService.employeeLogin(employeeCode, password);
    if (result.error) {
      return res
        .status(result.status)
        .json({ success: false, message: result.error });
    }

    logger.info(`👷 Employee login success: ${result.phone}`);

    res.json({
      success: true,
      token: result.token,
      role: result.role,
      name: result.name,
      phone: result.phone,
    });
  } catch (err) {
    logger.error(`❌ Employee Login Error: ${err.message}`);
    next(err);
  }
};

/* -------------------------------------------------------------------------- */
/* 🔄 Employee Password Reset                                                 */
/* -------------------------------------------------------------------------- */
const resetEmployeePassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6)
      return res
        .status(400)
        .json({ success: false, message: "Password too short" });

    const result = await authService.resetEmployeePassword(req.user.id, newPassword);
    if (result.error) {
      return res
        .status(result.status)
        .json({ success: false, message: result.error });
    }

    logger.info(`🔄 Password reset success: ${result.phone}`);

    res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    logger.error(`❌ Password Reset Error: ${err.message}`);
    next(err);
  }
};

/* -------------------------------------------------------------------------- */
/* ✏️ UPDATE EMPLOYEE (Admin Only)                                           */
/* -------------------------------------------------------------------------- */
const updateEmployee = async (req, res, next) => {
  try {
    const result = await authService.updateEmployee(req.params.id, req.body);

    if (result.error) {
      return res
        .status(result.status)
        .json({ success: false, message: result.error });
    }

    res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: result,
    });
  } catch (err) {
    logger.error(`❌ Update Employee Error: ${err.message}`);
    next(err);
  }
};

/* -------------------------------------------------------------------------- */
/* ❌ DELETE EMPLOYEE                                                          */
/* -------------------------------------------------------------------------- */
const deleteEmployee = async (req, res, next) => {
  try {
    const result = await authService.deleteEmployee(req.params.id);

    if (result.error) {
      return res
        .status(result.status)
        .json({ success: false, message: result.error });
    }

    logger.info(`🗑️ Deleted Employee: ${result.phone}`);

    res.json({ success: true, message: "Employee deleted successfully" });
  } catch (err) {
    logger.error(`❌ Delete Employee Error: ${err.message}`);
    next(err);
  }
};

/* -------------------------------------------------------------------------- */
/* 📋 GET ALL EMPLOYEES                                                       */
/* -------------------------------------------------------------------------- */
const getEmployees = async (req, res, next) => {
  try {
    const employees = await authService.getEmployees();

    res.json({
      success: true,
      count: employees.length,
      data: employees,
    });
  } catch (err) {
    logger.error(`❌ Get Employees Error: ${err.message}`);
    next(err);
  }
};

module.exports = {
  ensureAdminExists,
  adminLogin,
  addEmployee,
  updateEmployee,
  employeeLogin,
  resetEmployeePassword,
  deleteEmployee,
  getEmployees,
};
