"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const pool_1 = require("../../db/pool");
const common_1 = require("../../utils/common");
const httpError_1 = require("../../utils/httpError");
const orders_schema_1 = require("../orders/orders.schema");
const orders = __importStar(require("../orders/orders.service"));
// Mọi route trong file này yêu cầu quyền admin. Gắn tại /api/admin
const router = (0, express_1.Router)();
router.use(auth_1.authenticate, (0, auth_1.requireRole)("admin"));
router.get("/stats", (0, httpError_1.asyncHandler)(async (_req, res) => {
    const totals = (await (0, pool_1.query)(`SELECT (SELECT COUNT(*)::int FROM users WHERE role = 'customer') AS customers,
                (SELECT COUNT(*)::int FROM products WHERE is_active) AS products,
                (SELECT COUNT(*)::int FROM orders) AS orders,
                (SELECT COALESCE(SUM(total_amount), 0)::float FROM orders WHERE status = 'delivered') AS revenue`))[0];
    const ordersByStatus = await (0, pool_1.query)("SELECT status, COUNT(*)::int AS count FROM orders GROUP BY status");
    const topProducts = await (0, pool_1.query)("SELECT id, name, sold_count, view_count FROM products ORDER BY sold_count DESC, view_count DESC LIMIT 5");
    res.json({ ...totals, ordersByStatus, topProducts });
}));
// ----- Quản lý người dùng -----
const userListSchema = zod_1.z.object({ ...common_1.paginationShape, q: zod_1.z.string().trim().max(100).optional() });
router.get("/users", (0, validate_1.validate)(userListSchema, "query"), (0, httpError_1.asyncHandler)(async (req, res) => {
    const { page, limit, q } = req.query;
    const params = [];
    let where = "";
    if (q) {
        params.push(`%${q.replace(/[\\%_]/g, "\\$&")}%`);
        where = "WHERE email ILIKE $1 OR full_name ILIKE $1";
    }
    const total = (await (0, pool_1.query)(`SELECT COUNT(*)::int AS n FROM users ${where}`, params))[0].n;
    const items = await (0, pool_1.query)(`SELECT id, email, full_name, phone, role, is_active, created_at FROM users ${where}
       ORDER BY created_at DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`, params);
    res.json((0, common_1.buildPage)(items, total, page, limit));
}));
router.patch("/users/:id/status", (0, validate_1.validate)(common_1.uuidParam, "params"), (0, validate_1.validate)(zod_1.z.object({ isActive: zod_1.z.boolean() })), (0, httpError_1.asyncHandler)(async (req, res) => {
    // Không khóa tài khoản admin (kể cả chính mình)
    const rows = await (0, pool_1.query)("UPDATE users SET is_active = $2 WHERE id = $1 AND role = 'customer' RETURNING id, email, is_active", [req.params.id, req.body.isActive]);
    if (!rows[0])
        throw new httpError_1.HttpError(404, "Không tìm thấy người dùng hoặc không thể thay đổi tài khoản này");
    res.json(rows[0]);
}));
// ----- Quản lý đơn hàng -----
router.get("/orders", (0, validate_1.validate)(orders_schema_1.orderListQuerySchema, "query"), (0, httpError_1.asyncHandler)(async (req, res) => {
    const q = req.query;
    res.json(await orders.listAll(q.status, q.page, q.limit));
}));
router.get("/orders/:id", (0, validate_1.validate)(common_1.uuidParam, "params"), (0, httpError_1.asyncHandler)(async (req, res) => {
    res.json(await orders.getById(req.params.id, req.user));
}));
router.patch("/orders/:id/status", (0, validate_1.validate)(common_1.uuidParam, "params"), (0, validate_1.validate)(orders_schema_1.statusBodySchema), (0, httpError_1.asyncHandler)(async (req, res) => {
    res.json(await orders.changeStatus(req.params.id, req.body.status, req.user));
}));
exports.default = router;
