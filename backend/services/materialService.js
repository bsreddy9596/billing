const Material = require("../models/Material");
const logActivity = require("../utils/logActivity");
const createNotification = require("../utils/createNotification");

class MaterialService {
    async addMaterial(data, userId, userRole, io) {
        const { name, unit, costPerUnit, availableQty, minThreshold } = data;

        if (!name) return { error: "Material name is required", status: 400 };

        const exists = await Material.findOne({ name });
        if (exists) return { error: "Material already exists", status: 409 };

        const finalCost = userRole === "admin" ? costPerUnit || 0 : 0;

        const material = await Material.create({
            name,
            unit: unit || "pcs",
            costPerUnit: finalCost,
            availableQty: availableQty || 0,
            minThreshold: minThreshold || 5,
            createdBy: userId,
        });

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
            userId,
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

        return material;
    }

    async getMaterials(userRole) {
        const materials = await Material.find().sort({ createdAt: -1 }).lean();

        const sanitized =
            userRole === "admin"
                ? materials
                : materials.map(({ costPerUnit, ...rest }) => rest);

        return sanitized;
    }

    async updatePrice(id, costPerUnit, userId, io) {
        if (isNaN(costPerUnit)) return { error: "Invalid costPerUnit value", status: 400 };

        const mat = await Material.findByIdAndUpdate(
            id,
            { costPerUnit },
            { new: true }
        );

        if (!mat) return { error: "Material not found", status: 404 };

        io.emit("analytics-updated");
        io.emit("material-updated", {
            materialId: mat._id,
            name: mat.name,
            costPerUnit: mat.costPerUnit,
        });

        await logActivity({
            userId,
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

        return mat;
    }

    async addStock(id, qty, userId, io) {
        if (!qty || isNaN(qty)) return { error: "Valid qty is required", status: 400 };

        const mat = await Material.findById(id);
        if (!mat) return { error: "Material not found", status: 404 };

        mat.availableQty += Number(qty);
        await mat.save();

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
            userId,
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

        return mat;
    }

    async updateMaterial(id, data, io) {
        const { name, unit, costPerUnit, availableQty, quality } = data;

        const mat = await Material.findById(id);
        if (!mat) return { error: "Material not found", status: 404 };

        if (name) mat.name = name;
        if (unit) mat.unit = unit;
        if (costPerUnit !== undefined) mat.costPerUnit = costPerUnit;
        if (availableQty !== undefined) mat.availableQty = availableQty;
        if (quality !== undefined) mat.quality = quality;

        await mat.save();

        io.emit("material-updated", mat);

        return mat;
    }

    async deleteMaterial(id, userId, io) {
        const mat = await Material.findById(id);
        if (!mat) return { error: "Material not found", status: 404 };

        await mat.deleteOne();

        io.emit("material-deleted", {
            materialId: mat._id,
            name: mat.name,
        });

        io.emit("analytics-updated");

        await logActivity({
            userId,
            action: "MATERIAL_DELETED",
            targetType: "Material",
            targetId: mat._id,
            message: `${mat.name} material deleted`,
        });

        return mat;
    }
}

module.exports = new MaterialService();
