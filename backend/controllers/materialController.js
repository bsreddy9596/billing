const materialService = require("../services/materialService");
const logger = require("../config/logger");

/* -------------------------------------------------------------------------- */
/* ➕ Add New Material (Admin + Employee)                                     */
/* -------------------------------------------------------------------------- */
async function addMaterial(req, res, next) {
  try {
    const io = req.app.get("io");
    const result = await materialService.addMaterial(req.body, req.user._id, req.user.role, io);

    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }

    logger.info(`✅ Material created: ${result.name}`);
    res.status(201).json({ success: true, data: result });
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
    const sanitized = await materialService.getMaterials(req.user.role);
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
    const io = req.app.get("io");
    const result = await materialService.updatePrice(req.params.id, req.body.costPerUnit, req.user._id, io);

    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }

    logger.info(`💰 Material cost updated: ${result.name}`);
    res.json({ success: true, message: "Cost updated", data: result });
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
    const io = req.app.get("io");
    const result = await materialService.addStock(req.params.id, req.body.qty, req.user._id, io);

    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }

    logger.info(`📦 Material stock updated: ${result.name} +${req.body.qty}`);
    res.json({
      success: true,
      message: `${req.body.qty} ${result.unit} added to ${result.name}`,
      data: result,
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
    const io = req.app.get("io");
    const result = await materialService.updateMaterial(req.params.id, req.body, io);

    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }

    logger.info(`✏️ Material updated: ${result.name}`);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(`❌ Update Material Error: ${err.message}`);
    next(err);
  }
}

/* -------------------------------------------------------------------------- */
/* 🗑️ Delete Material (Admin Only)                                           */
/* -------------------------------------------------------------------------- */
async function deleteMaterial(req, res, next) {
  try {
    const io = req.app.get("io");
    const result = await materialService.deleteMaterial(req.params.id, req.user._id, io);

    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }

    logger.info(`🗑️ Material deleted: ${result.name}`);
    res.json({ success: true, message: "Material deleted successfully" });
  } catch (err) {
    logger.error(`❌ Delete Material Error: ${err.message}`);
    next(err);
  }
}

module.exports = {
  addMaterial,
  getMaterials,
  updatePrice,
  addStock,
  updateMaterial,
  deleteMaterial,
};
