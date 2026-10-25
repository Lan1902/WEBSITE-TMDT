import { Router } from "express";
import { z } from "zod";
import { authenticate, optionalAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { query } from "../../db/pool";
import { buildPage, paginationShape, uuidParam } from "../../utils/common";
import { asyncHandler, HttpError } from "../../utils/httpError";

// Router này được gắn tại /api
const router = Router();

const reviewSchema = z.object({
  rating: z.number().int().min(1, "Điểm đánh giá từ 1 đến 5").max(5, "Điểm đánh giá từ 1 đến 5"),
  comment: z.string().trim().max(2000).optional(),
});
const listSchema = z.object({ ...paginationShape });

// Chỉ người đã nhận hàng (đơn delivered) mới được đánh giá
const hasPurchased = async (userId: string, productId: string) =>
  (
    await query(
      `SELECT 1 FROM orders o JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = $1 AND oi.product_id = $2 AND o.status = 'delivered' LIMIT 1`,
      [userId, productId]
    )
  ).length > 0;

router.get(
  "/products/:id/reviews",
  optionalAuth,
  validate(uuidParam, "params"),
  validate(listSchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const productId = req.params.id;
    const stats = (
      await query(
        `SELECT COUNT(*)::int AS count, COALESCE(ROUND(AVG(rating)::numeric, 1), 0)::float AS average
         FROM reviews WHERE product_id = $1`,
        [productId]
      )
    )[0];
    const items = await query(
      `SELECT r.id, r.rating, r.comment, r.created_at, u.full_name AS user_name, (r.user_id = $4) AS is_mine
       FROM reviews r JOIN users u ON u.id = r.user_id
       WHERE r.product_id = $1
       ORDER BY r.created_at DESC LIMIT $2 OFFSET $3`,
      [productId, limit, (page - 1) * limit, req.user?.id ?? null]
    );
    const canReview = req.user ? await hasPurchased(req.user.id, productId) : false;
    res.json({ ...buildPage(items, stats.count, page, limit), average: stats.average, canReview });
  })
);

// Mỗi người một đánh giá cho mỗi sản phẩm; gửi lại sẽ cập nhật đánh giá cũ
router.post(
  "/products/:id/reviews",
  authenticate,
  validate(uuidParam, "params"),
  validate(reviewSchema),
  asyncHandler(async (req, res) => {
    if (!(await hasPurchased(req.user!.id, req.params.id)))
      throw new HttpError(403, "Bạn chỉ có thể đánh giá sản phẩm đã mua và đã nhận hàng");
    const rows = await query(
      `INSERT INTO reviews (user_id, product_id, rating, comment) VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = NOW()
       RETURNING id, rating, comment, created_at`,
      [req.user!.id, req.params.id, req.body.rating, req.body.comment ?? null]
    );
    res.status(201).json(rows[0]);
  })
);

router.delete(
  "/reviews/:id",
  authenticate,
  validate(uuidParam, "params"),
  asyncHandler(async (req, res) => {
    const rows = await query(
      "DELETE FROM reviews WHERE id = $1 AND ($2 = 'admin' OR user_id = $3) RETURNING id",
      [req.params.id, req.user!.role, req.user!.id]
    );
    if (!rows[0]) throw new HttpError(404, "Không tìm thấy đánh giá");
    res.status(204).end();
  })
);

export default router;
