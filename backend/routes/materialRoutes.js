const express = require("express");
const router = express.Router();
const { protect, checkRole } = require("../middlewares/authMiddleware");
const materialController = require("../controllers/materialController");

router.post(
  "/",
  protect,
  checkRole("admin", "employee"),
  materialController.addMaterial
);

router.get(
  "/",
  protect,
  checkRole("admin", "employee"),
  materialController.getMaterials
);

router.put(
  "/:id",
  protect,
  checkRole("admin"),
  materialController.updateMaterial
);

router.put(
  "/:id/price",
  protect,
  checkRole("admin"),
  materialController.updatePrice
);

router.put(
  "/:id/add-stock",
  protect,
  checkRole("admin", "employee"),
  materialController.addStock
);

router.delete(
  "/:id",
  protect,
  checkRole("admin"),
  materialController.deleteMaterial
);

module.exports = router;
