const Material = require("../models/Material");
const logActivity = require("../utils/logActivity");
const createNotification = require("../utils/createNotification");
const logger = require("../config/logger");

/* -------------------------------------------------------------------------- */
/* ➕ Add New Material (Admin + Employee)                                     */
/* -------------------------------------------------------------------------- */
async function addMaterial(req, res, next) {
  try {
    const { name, unit, costPerUnit, availableQty, minThreshold } = req.body;

    if (!name)
      return res
        .status(400)
        .json({ success: false, message: "Material name is required" });

    const exists = await Material.findOne({ name });
    if (exists)
      return res
        .status(409)
        .json({ success: false, message: "Material already exists" });

    /** ⭐ IMPORTANT CHANGE ⭐
     * If employee adds material → costPerUnit MUST always be 0
     */
    const finalCost = req.user.role === "admin" ? costPerUnit || 0 : 0;

    const material = await Material.create({
      name,
      unit: unit || "pcs",
      costPerUnit: finalCost,
      availableQty: availableQty || 0,
      minThreshold: minThreshold || 5,
      createdBy: req.user._id,
    });

    const io = req.app.get("io");

    // 🔔 Low stock alert (on create)
    if (material.availableQty <= material.minThreshold) {
      io.emit("material-low", {
        materialId: material._id,
        name: material.name,
        availableQty: material.availableQty,
        minThreshold: material.minThreshold,
        message: `⚠️ ${material.name} stock low (${material.availableQty} ${material.unit})`,
      });
    }

    io.emit("analytics-updated");

    await logActivity({
      userId: req.user._id,
      action: "MATERIAL_ADDED",
      targetType: "Material",
      targetId: material._id,
      message: `${material.name} added (${material.availableQty} ${material.unit})`,
    });

    await createNotification({
      io,
      toRole: "admin",
      title: "New Material Added",
      body: `${material.name} material created successfully.`,
      data: { materialId: material._id },
    });

    logger.info(`✅ Material created: ${material.name}`);
    res.status(201).json({ success: true, data: material });
  } catch (err) {
    logger.error(`❌ Add Material Error: ${err.message}`);
    next(err);
  }
}

/* -------------------------------------------------------------------------- */
/* 📦 Get Materials (Admin vs Employee View)                                 */
/* -------------------------------------------------------------------------- */
async function getMaterials(req, res, next) {
  try {
    const materials = await Material.find().sort({ createdAt: -1 }).lean();

    /** ⭐ Employee should NOT see costPerUnit */
    const sanitized =
      req.user.role === "admin"
        ? materials
        : materials.map(({ costPerUnit, ...rest }) => rest);

    res.json({ success: true, count: sanitized.length, data: sanitized });
  } catch (err) {
    logger.error(`❌ Get Materials Error: ${err.message}`);
    next(err);
  }
}

/* -------------------------------------------------------------------------- */
/* 💰 Update Material Price (Admin Only)                                     */
/* -------------------------------------------------------------------------- */
async function updatePrice(req, res, next) {
  try {
    const { costPerUnit } = req.body;

    if (isNaN(costPerUnit))
      return res
        .status(400)
        .json({ success: false, message: "Invalid costPerUnit value" });

    const mat = await Material.findByIdAndUpdate(
      req.params.id,
      { costPerUnit },
      { new: true }
    );

    if (!mat)
      return res
        .status(404)
        .json({ success: false, message: "Material not found" });

    const io = req.app.get("io");

    io.emit("analytics-updated");
    io.emit("material-updated", {
      materialId: mat._id,
      name: mat.name,
      costPerUnit: mat.costPerUnit,
    });

    await logActivity({
      userId: req.user._id,
      action: "MATERIAL_PRICE_UPDATED",
      targetType: "Material",
      targetId: mat._id,
      message: `${mat.name} cost updated to ₹${mat.costPerUnit}`,
    });

    await createNotification({
      io,
      toRole: "admin",
      title: "Material Cost Updated",
      body: `${mat.name} cost changed to ₹${mat.costPerUnit}`,
      data: { materialId: mat._id },
    });

    logger.info(`💰 Material cost updated: ${mat.name}`);
    res.json({ success: true, message: "Cost updated", data: mat });
  } catch (err) {
    logger.error(`❌ Update Price Error: ${err.message}`);
    next(err);
  }
}

/* -------------------------------------------------------------------------- */
/* 🔄 Add Stock (Admin or Employee)                                          */
/* -------------------------------------------------------------------------- */
async function addStock(req, res, next) {
  try {
    const { qty } = req.body;

    if (!qty || isNaN(qty))
      return res
        .status(400)
        .json({ success: false, message: "Valid qty is required" });

    const mat = await Material.findById(req.params.id);
    if (!mat)
      return res
        .status(404)
        .json({ success: false, message: "Material not found" });

    mat.availableQty += Number(qty);
    await mat.save();

    const io = req.app.get("io");

    // Alerts
    if (mat.availableQty <= mat.minThreshold) {
      io.emit("material-low", {
        materialId: mat._id,
        name: mat.name,
        availableQty: mat.availableQty,
        minThreshold: mat.minThreshold,
        message: `⚠️ ${mat.name} still low (${mat.availableQty} ${mat.unit})`,
      });
    } else {
      io.emit("material-restocked", {
        materialId: mat._id,
        name: mat.name,
        availableQty: mat.availableQty,
        message: `✅ ${mat.name} restocked (${mat.availableQty} ${mat.unit})`,
      });
    }

    io.emit("analytics-updated");

    await logActivity({
      userId: req.user._id,
      action: "MATERIAL_STOCK_ADDED",
      targetType: "Material",
      targetId: mat._id,
      message: `${qty} ${mat.unit} added to ${mat.name}`,
    });

    await createNotification({
      io,
      toRole: "admin",
      title: "Material Restocked",
      body: `${mat.name} increased by ${qty} ${mat.unit}`,
      data: { materialId: mat._id },
    });

    logger.info(`📦 Material stock updated: ${mat.name} +${qty}`);
    res.json({
      success: true,
      message: `${qty} ${mat.unit} added to ${mat.name}`,
      data: mat,
    });
  } catch (err) {
    logger.error(`❌ Add Stock Error: ${err.message}`);
    next(err);
  }
}

/* -------------------------------------------------------------------------- */
/* ✏️ Update Full Material Details (Admin Only)                               */
/* -------------------------------------------------------------------------- */
async function updateMaterial(req, res, next) {
  try {
    const { name, unit, costPerUnit, availableQty, quality } = req.body;

    const mat = await Material.findById(req.params.id);

    if (!mat)
      return res
        .status(404)
        .json({ success: false, message: "Material not found" });

    // Allow admin to update all fields
    if (name) mat.name = name;
    if (unit) mat.unit = unit;
    if (costPerUnit !== undefined) mat.costPerUnit = costPerUnit;
    if (availableQty !== undefined) mat.availableQty = availableQty;
    if (quality !== undefined) mat.quality = quality;

    await mat.save();

    const io = req.app.get("io");
    io.emit("material-updated", mat);

    logger.info(`✏️ Material updated: ${mat.name}`);

    res.json({ success: true, data: mat });
  } catch (err) {
    logger.error(`❌ Update Material Error: ${err.message}`);
    next(err);
  }
}

/* -------------------------------------------------------------------------- */
module.exports = {
  addMaterial,
  getMaterials,
  updatePrice,
  addStock,
  updateMaterial,
};
