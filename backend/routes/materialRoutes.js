const express = require("express");
const router = express.Router();
const { protect, checkRole } = require("../middlewares/authMiddleware");
const materialController = require("../controllers/materialController");

/* ADD MATERIAL — admin + employee */
router.post(
  "/",
  protect,
  checkRole("admin", "employee"),
  materialController.addMaterial
);

/* GET MATERIALS — admin + employee */
router.get(
  "/",
  protect,
  checkRole("admin", "employee"),
  materialController.getMaterials
);

/* ✏️ FULL MATERIAL UPDATE — admin only */
router.put(
  "/:id",
  protect,
  checkRole("admin"),
  materialController.updateMaterial // <-- REQUIRED
);

/* UPDATE PRICE ONLY — admin only */
router.put(
  "/:id/price",
  protect,
  checkRole("admin"),
  materialController.updatePrice
);

/* ADD STOCK — admin + employee */
router.put(
  "/:id/add-stock",
  protect,
  checkRole("admin", "employee"),
  materialController.addStock
);

module.exports = router;
