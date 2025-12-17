const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const { protect, checkRole } = require("../middlewares/authMiddleware");

// LOGIN ROUTES
router.post("/admin/login", authController.adminLogin);
router.post("/employee/login", authController.employeeLogin);

// CREATE EMPLOYEE (Admin)
router.post(
  "/employee/add",
  protect,
  checkRole("admin"),
  authController.addEmployee
);

// UPDATE EMPLOYEE (Admin)  ⭐ REQUIRED FOR FIX
router.put(
  "/employee/:id",
  protect,
  checkRole("admin"),
  authController.updateEmployee
);

// RESET EMPLOYEE PASSWORD
router.post(
  "/employee/reset-password",
  protect,
  checkRole("admin"),
  authController.resetEmployeePassword
);

// GET ALL EMPLOYEES (Admin)
router.get(
  "/employees",
  protect,
  checkRole("admin"),
  authController.getEmployees
);

// DELETE EMPLOYEE (Admin)
router.delete(
  "/employee/:id",
  protect,
  checkRole("admin"),
  authController.deleteEmployee
);

module.exports = router;
