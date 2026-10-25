"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const pool_1 = require("../../db/pool");
const httpError_1 = require("../../utils/httpError");
const common_1 = require("../../utils/common");
const router = (0, express_1.Router)();
const admin = [auth_1.authenticate, (0, auth_1.requireRole)("admin")];
const categorySchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2, "Tên danh mục quá ngắn").max(100),
    description: zod_1.z.string().trim().max(1000).optional(),
});
router.get("/", (0, httpError_1.asyncHandler)(async (_req, res) => {
    res.json(await (0, pool_1.query)(`SELECT c.id, c.name, c.slug, c.description,
                (SELECT COUNT(*)::int FROM products p WHERE p.category_id = c.id AND p.is_active) AS product_count
         FROM categories c ORDER BY c.name`));
}));
router.post("/", ...admin, (0, validate_1.validate)(categorySchema), (0, httpError_1.asyncHandler)(async (req, res) => {
    const { name, description } = req.body;
    const rows = await (0, pool_1.query)("INSERT INTO categories (name, slug, description) VALUES ($1, $2, $3) RETURNING *", [name, (0, common_1.slugify)(name), description ?? null]);
    res.status(201).json(rows[0]);
}));
router.put("/:id", ...admin, (0, validate_1.validate)(common_1.intParam, "params"), (0, validate_1.validate)(categorySchema), (0, httpError_1.asyncHandler)(async (req, res) => {
    const { name, description } = req.body;
    const rows = await (0, pool_1.query)("UPDATE categories SET name = $2, slug = $3, description = $4 WHERE id = $1 RETURNING *", [req.params.id, name, (0, common_1.slugify)(name), description ?? null]);
    if (!rows[0])
        throw new httpError_1.HttpError(404, "Không tìm thấy danh mục");
    res.json(rows[0]);
}));
router.delete("/:id", ...admin, (0, validate_1.validate)(common_1.intParam, "params"), (0, httpError_1.asyncHandler)(async (req, res) => {
    const used = await (0, pool_1.query)("SELECT 1 FROM products WHERE category_id = $1 LIMIT 1", [req.params.id]);
    if (used.length)
        throw new httpError_1.HttpError(409, "Danh mục đang có sản phẩm, không thể xóa");
    const rows = await (0, pool_1.query)("DELETE FROM categories WHERE id = $1 RETURNING id", [req.params.id]);
    if (!rows[0])
        throw new httpError_1.HttpError(404, "Không tìm thấy danh mục");
    res.status(204).end();
}));
exports.default = router;
