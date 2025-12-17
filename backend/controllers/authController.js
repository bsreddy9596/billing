const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const logger = require("../config/logger");

/* -------------------------------------------------------------------------- */
/* 🔹 Helper Functions                                                        */
/* -------------------------------------------------------------------------- */

const generateToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

const generateEmployeeCode = () =>
  `EMP${Math.floor(10000 + Math.random() * 90000)}`;

/* -------------------------------------------------------------------------- */
/* 👑 Auto-create Single Admin                                                */
/* -------------------------------------------------------------------------- */
const ensureAdminExists = async () => {
  try {
    const { ADMIN_PHONE, ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD } =
      process.env;

    if (!ADMIN_PHONE || !ADMIN_PASSWORD) {
      logger.warn("⚠️ ADMIN_PHONE or ADMIN_PASSWORD missing in .env");
      return;
    }

    let admin = await User.findOne({ phone: ADMIN_PHONE, role: "admin" });

    if (!admin) {
      const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
      admin = await User.create({
        name: ADMIN_NAME || "Super Admin",
        email: ADMIN_EMAIL || "admin@example.com",
        phone: ADMIN_PHONE,
        role: "admin",
        passwordHash: hashed,
        isApproved: true,
      });
      logger.info(`✅ Default Admin created (${ADMIN_PHONE})`);
    } else {
      logger.info("👑 Admin already exists");
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

    const user = await User.findOne({ phone, role: "admin" });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid)
      return res
        .status(401)
        .json({ success: false, message: "Invalid password" });

    const token = generateToken(user);
    user.lastLoginAt = new Date();
    await user.save();

    logger.info(`👑 Admin login success (${phone})`);

    res.json({
      success: true,
      token,
      role: user.role,
      name: user.name,
      phone: user.phone,
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

    const existing = await User.findOne({ phone });
    if (existing)
      return res
        .status(400)
        .json({ success: false, message: "Phone already registered" });

    const hash = await bcrypt.hash(password, 10);
    const employeeCode = generateEmployeeCode();

    const emp = await User.create({
      name,
      phone,
      passwordHash: hash,
      role: "employee",
      employeeCode,
      isApproved: true,
      adminId: req.user._id,
    });

    logger.info(`✅ Employee created by admin: ${name} (${phone})`);

    res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: {
        id: emp._id,
        name: emp.name,
        phone: emp.phone,
        code: emp.employeeCode,
        password,
      },
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

    const user = await User.findOne({ employeeCode, role: "employee" });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid)
      return res
        .status(401)
        .json({ success: false, message: "Invalid password" });

    const token = generateToken(user);
    user.lastLoginAt = new Date();
    await user.save();

    logger.info(`👷 Employee login success: ${user.phone}`);

    res.json({
      success: true,
      token,
      role: user.role,
      name: user.name,
      phone: user.phone,
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

    const user = await User.findById(req.user.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    logger.info(`🔄 Password reset success: ${user.phone}`);

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
    const { name, phone, email, role, status, salary } = req.body;

    const employee = await User.findById(req.params.id);

    if (!employee || employee.role !== "employee")
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });

    // Update fields
    employee.name = name ?? employee.name;
    employee.phone = phone ?? employee.phone;
    employee.email = email ?? employee.email;
    employee.role = role ?? employee.role;
    employee.status = status ?? employee.status;
    employee.salary = salary ?? employee.salary;

    await employee.save();

    res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: employee,
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
    const employee = await User.findById(req.params.id);

    if (!employee || employee.role !== "employee")
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });

    await User.findByIdAndDelete(req.params.id);

    logger.info(`🗑️ Deleted Employee: ${employee.phone}`);

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
    const employees = await User.find({ role: "employee" })
      .select("-passwordHash -__v")
      .sort({ createdAt: -1 });

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
