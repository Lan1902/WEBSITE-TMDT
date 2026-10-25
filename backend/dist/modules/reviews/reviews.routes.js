"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const pool_1 = require("../../db/pool");
const common_1 = require("../../utils/common");
const httpError_1 = require("../../utils/httpError");
// Router này được gắn tại /api
const router = (0, express_1.Router)();
const reviewSchema = zod_1.z.object({
    rating: zod_1.z.number().int().min(1, "Điểm đánh giá từ 1 đến 5").max(5, "Điểm đánh giá từ 1 đến 5"),
    comment: zod_1.z.string().trim().max(2000).optional(),
});
const listSchema = zod_1.z.object({ ...common_1.paginationShape });
// Chỉ người đã nhận hàng (đơn delivered) mới được đánh giá
const hasPurchased = async (userId, productId) => (await (0, pool_1.query)(`SELECT 1 FROM orders o JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = $1 AND oi.product_id = $2 AND o.status = 'delivered' LIMIT 1`, [userId, productId])).length > 0;
router.get("/products/:id/reviews", auth_1.optionalAuth, (0, validate_1.validate)(common_1.uuidParam, "params"), (0, validate_1.validate)(listSchema, "query"), (0, httpError_1.asyncHandler)(async (req, res) => {
    const { page, limit } = req.query;
    const productId = req.params.id;
    const stats = (await (0, pool_1.query)(`SELECT COUNT(*)::int AS count, COALESCE(ROUND(AVG(rating)::numeric, 1), 0)::float AS average
         FROM reviews WHERE product_id = $1`, [productId]))[0];
    const items = await (0, pool_1.query)(`SELECT r.id, r.rating, r.comment, r.created_at, u.full_name AS user_name, (r.user_id = $4) AS is_mine
       FROM reviews r JOIN users u ON u.id = r.user_id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC LIMIT $2 OFFSET $3`, [productId, limit, (page - 1) * limit, req.user?.id ?? null]);
    const canReview = req.user ? await hasPurchased(req.user.id, productId) : false;
    res.json({ ...(0, common_1.buildPage)(items, stats.count, page, limit), average: stats.average, canReview });
}));
// Mỗi người một đánh giá cho mỗi sản phẩm; gửi lại sẽ cập nhật đánh giá cũ
router.post("/products/:id/reviews", auth_1.authenticate, (0, validate_1.validate)(common_1.uuidParam, "params"), (0, validate_1.validate)(reviewSchema), (0, httpError_1.asyncHandler)(async (req, res) => {
    if (!(await hasPurchased(req.user.id, req.params.id)))
        throw new httpError_1.HttpError(403, "Bạn chỉ có thể đánh giá sản phẩm đã mua và đã nhận hàng");
    const rows = await (0, pool_1.query)(`INSERT INTO reviews (user_id, product_id, rating, comment) VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = NOW()
       RETURNING id, rating, comment, created_at`, [req.user.id, req.params.id, req.body.rating, req.body.comment ?? null]);
    res.status(201).json(rows[0]);
}));
router.delete("/reviews/:id", auth_1.authenticate, (0, validate_1.validate)(common_1.uuidParam, "params"), (0, httpError_1.asyncHandler)(async (req, res) => {
    const rows = await (0, pool_1.query)("DELETE FROM reviews WHERE id = $1 AND ($2 = 'admin' OR user_id = $3) RETURNING id", [req.params.id, req.user.role, req.user.id]);
    if (!rows[0])
        throw new httpError_1.HttpError(404, "Không tìm thấy đánh giá");
    res.status(204).end();
}));
exports.default = router;
