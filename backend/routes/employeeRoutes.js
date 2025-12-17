const express = require("express");
const router = express.Router();

const {
  getEmployees,
  createEmployee,
  addLedgerEntry,
  getEmployeeLedger,
  getMyLedger,
  deleteEmployee,
  updateLedgerEntry,
  removeLedgerEntry,
} = require("../controllers/employeeController");

const { protect, adminOnly } = require("../middlewares/authMiddleware");

router.get("/ledger/my", protect, getMyLedger);
router.get("/", protect, adminOnly, getEmployees);
router.post("/", protect, adminOnly, createEmployee);
router.get("/ledger/:id", protect, adminOnly, getEmployeeLedger);
router.post("/ledger", protect, adminOnly, addLedgerEntry);
router.put("/ledger/:id", protect, adminOnly, updateLedgerEntry);
router.delete("/ledger/:id", protect, adminOnly, removeLedgerEntry);
router.delete("/:id", protect, adminOnly, deleteEmployee);

module.exports = router;
