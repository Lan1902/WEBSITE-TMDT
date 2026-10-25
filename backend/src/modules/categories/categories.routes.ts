import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { query } from "../../db/pool";
import { asyncHandler, HttpError } from "../../utils/httpError";
import { intParam, slugify } from "../../utils/common";

const router = Router();
const admin = [authenticate, requireRole("admin")];

const categorySchema = z.object({
  name: z.string().trim().min(2, "Tên danh mục quá ngắn").max(100),
  description: z.string().trim().max(1000).optional(),
});

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(
      await query(
        `SELECT c.id, c.name, c.slug, c.description,
                (SELECT COUNT(*)::int FROM products p WHERE p.category_id = c.id AND p.is_active) AS product_count
         FROM categories c ORDER BY c.name`
      )
    );
  })
);

router.post(
  "/",
  ...admin,
  validate(categorySchema),
  asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    const rows = await query(
      "INSERT INTO categories (name, slug, description) VALUES ($1, $2, $3) RETURNING *",
      [name, slugify(name), description ?? null]
    );
    res.status(201).json(rows[0]);
  })
);

router.put(
  "/:id",
  ...admin,
  validate(intParam, "params"),
  validate(categorySchema),
  asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    const rows = await query(
      "UPDATE categories SET name = $2, slug = $3, description = $4 WHERE id = $1 RETURNING *",
      [req.params.id, name, slugify(name), description ?? null]
    );
    if (!rows[0]) throw new HttpError(404, "Không tìm thấy danh mục");
    res.json(rows[0]);
  })
);

router.delete(
  "/:id",
  ...admin,
  validate(intParam, "params"),
  asyncHandler(async (req, res) => {
    const used = await query("SELECT 1 FROM products WHERE category_id = $1 LIMIT 1", [req.params.id]);
    if (used.length) throw new HttpError(409, "Danh mục đang có sản phẩm, không thể xóa");
    const rows = await query("DELETE FROM categories WHERE id = $1 RETURNING id", [req.params.id]);
    if (!rows[0]) throw new HttpError(404, "Không tìm thấy danh mục");
    res.status(204).end();
  })
);

export default router;
