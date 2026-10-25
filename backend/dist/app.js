"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const env_1 = require("./config/env");
const error_1 = require("./middleware/error");
const admin_routes_1 = __importDefault(require("./modules/admin/admin.routes"));
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const cart_routes_1 = __importDefault(require("./modules/cart/cart.routes"));
const categories_routes_1 = __importDefault(require("./modules/categories/categories.routes"));
const orders_routes_1 = __importDefault(require("./modules/orders/orders.routes"));
const products_routes_1 = __importDefault(require("./modules/products/products.routes"));
const recommendations_routes_1 = __importDefault(require("./modules/recommendations/recommendations.routes"));
const reviews_routes_1 = __importDefault(require("./modules/reviews/reviews.routes"));
exports.app = (0, express_1.default)();
exports.app.set("trust proxy", 1); // chạy sau proxy của Render
exports.app.use((0, helmet_1.default)());
exports.app.use((0, cors_1.default)({ origin: env_1.env.CORS_ORIGIN.split(",").map((s) => s.trim()) }));
exports.app.use(express_1.default.json({ limit: "1mb" }));
exports.app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
exports.app.use("/api/auth", auth_routes_1.default);
exports.app.use("/api/categories", categories_routes_1.default);
exports.app.use("/api/products", products_routes_1.default);
exports.app.use("/api/cart", cart_routes_1.default);
exports.app.use("/api/orders", orders_routes_1.default);
exports.app.use("/api/recommendations", recommendations_routes_1.default);
exports.app.use("/api/admin", admin_routes_1.default);
exports.app.use("/api", reviews_routes_1.default); // /products/:id/reviews và /reviews/:id
exports.app.use(error_1.notFound);
exports.app.use(error_1.errorHandler);
