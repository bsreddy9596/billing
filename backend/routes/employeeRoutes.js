const express = require("express");
const router = express.Router();

const {
  getEmployees,
  createEmployee,
  addLedgerEntry,
  getEmployeeLedger,
  getMyLedger,
  updateLedgerEntry,
  removeLedgerEntry,
} = require("../controllers/employeeController");

const { protect, adminOnly } = require("../middlewares/authMiddleware");

router.get("/", protect, adminOnly, getEmployees);
router.post("/", protect, adminOnly, createEmployee);

router.get("/ledger/my", protect, getMyLedger);

router.get("/ledger/:id", protect, adminOnly, getEmployeeLedger);

router.post("/ledger", protect, adminOnly, addLedgerEntry);
router.put("/ledger/:id", protect, adminOnly, updateLedgerEntry);
router.delete("/ledger/:id", protect, adminOnly, removeLedgerEntry);

module.exports = router;
