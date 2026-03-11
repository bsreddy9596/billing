const Product = require("../models/Product");

function emitLowStock(io, product) {
    if (product.stockQty <= 3 && io) {
        io.emit("low-stock", {
            productId: product._id,
            name: product.name,
            stockQty: product.stockQty,
            message: `⚠️ Low stock: ${product.name} (${product.stockQty})`,
        });
    }
}

class ProductService {
    async createProduct(data, file, protocol, host, userRole, userId) {
        const { name, brand, stockQty, buyPrice, sellPrice } = data;

        if (!name || !sellPrice) {
            return { error: "Product name & sell price required", status: 400 };
        }

        const finalBuyPrice = userRole === "admin" ? Number(buyPrice || 0) : 0;

        const image = file
            ? `${protocol}://${host}/uploads/drawings/${file.filename}`
            : null;

        const product = await Product.create({
            name,
            brand,
            stockQty: Number(stockQty || 0),
            buyPrice: finalBuyPrice,
            sellPrice: Number(sellPrice),
            image,
            createdBy: userId,
        });

        return product;
    }

    async getProducts(userRole) {
        let products = await Product.find().sort({ createdAt: -1 }).lean();

        if (userRole !== "admin") {
            products = products.map(({ buyPrice, ...rest }) => rest);
        }

        return products;
    }

    async updateProduct(id, data, file, io) {
        const update = {
            name: data.name,
            brand: data.brand,
            stockQty: Number(data.stockQty || 0),
            buyPrice: Number(data.buyPrice || 0),
            sellPrice: Number(data.sellPrice),
        };

        if (file) {
            update.image = `/uploads/${file.filename}`;
        }

        const product = await Product.findByIdAndUpdate(id, update, {
            new: true,
        });

        if (!product) {
            return { error: "Product not found", status: 404 };
        }

        emitLowStock(io, product);

        return product;
    }

    async deleteProduct(id) {
        const product = await Product.findByIdAndDelete(id);

        if (!product) {
            return { error: "Product not found", status: 404 };
        }

        return true;
    }
}

module.exports = new ProductService();
