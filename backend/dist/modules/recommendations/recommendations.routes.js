"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const pool_1 = require("../../db/pool");
const httpError_1 = require("../../utils/httpError");
const router = (0, express_1.Router)();
const schema = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(20).default(8),
    productId: zod_1.z.string().uuid().optional(), // có: gợi ý "sản phẩm tương tự"
});
const POPULARITY = "LEAST(p.sold_count * 2 + p.view_count * 0.2, 50)";
const SELECT_COLS = `p.id, p.name, p.price::float AS price, p.image_url, p.category_id, c.name AS category_name,
  p.stock, (SELECT ROUND(AVG(r.rating)::numeric, 1)::float FROM reviews r WHERE r.product_id = p.id) AS avg_rating`;
/*
 * Gợi ý dựa trên 3 yếu tố (đúng yêu cầu đề tài):
 *  1. Danh mục: danh mục người dùng xem nhiều trong 30 lượt xem gần nhất (tối đa 60 điểm)
 *  2. Độ phổ biến: số lượng đã bán và lượt xem (tối đa 50 điểm)
 *  3. Lịch sử xem: loại bỏ các sản phẩm vừa xem để gợi ý thứ mới
 * Chưa đăng nhập hoặc chưa có lịch sử: gợi ý theo độ phổ biến.
 */
router.get("/", auth_1.optionalAuth, (0, validate_1.validate)(schema, "query"), (0, httpError_1.asyncHandler)(async (req, res) => {
    const { limit, productId } = req.query;
    if (productId) {
        const items = await (0, pool_1.query)(`SELECT ${SELECT_COLS}, 'similar' AS reason
         FROM products p JOIN categories c ON c.id = p.category_id
         WHERE p.is_active AND p.stock > 0 AND p.id <> $1
           AND p.category_id = (SELECT category_id FROM products WHERE id = $1)
         ORDER BY ${POPULARITY} DESC, p.created_at DESC LIMIT $2`, [productId, limit]);
        return res.json({ type: "similar", items });
    }
    if (req.user) {
        const items = await (0, pool_1.query)(`WITH recent AS (
           SELECT product_id FROM product_views WHERE user_id = $1 ORDER BY viewed_at DESC LIMIT 30
         ),
         pref AS (
           SELECT p.category_id, COUNT(*)::int AS w FROM recent r JOIN products p ON p.id = r.product_id GROUP BY p.category_id
         )
         SELECT ${SELECT_COLS},
                LEAST(COALESCE(pref.w, 0) * 20, 60) + ${POPULARITY} AS score,
                CASE WHEN pref.w IS NOT NULL THEN 'category' ELSE 'popular' END AS reason
         FROM products p
         JOIN categories c ON c.id = p.category_id
         LEFT JOIN pref ON pref.category_id = p.category_id
         WHERE p.is_active AND p.stock > 0
           AND p.id NOT IN (SELECT product_id FROM product_views WHERE user_id = $1 ORDER BY viewed_at DESC LIMIT 10)
         ORDER BY score DESC, p.created_at DESC LIMIT $2`, [req.user.id, limit]);
        return res.json({ type: "personalized", items });
    }
    const items = await (0, pool_1.query)(`SELECT ${SELECT_COLS}, 'popular' AS reason
       FROM products p JOIN categories c ON c.id = p.category_id
       WHERE p.is_active AND p.stock > 0
       ORDER BY ${POPULARITY} DESC, p.created_at DESC LIMIT $1`, [limit]);
    res.json({ type: "popular", items });
}));
exports.default = router;
