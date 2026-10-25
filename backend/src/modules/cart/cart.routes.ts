import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { query } from "../../db/pool";
import { asyncHandler, HttpError } from "../../utils/httpError";

const router = Router();
router.use(authenticate);

const addSchema = z.object({
  productId: z.string().uuid("ID sản phẩm không hợp lệ"),
  quantity: z.number().int().min(1).max(100).default(1),
});
const qtySchema = z.object({ quantity: z.number().int().min(1).max(100) });
const productParam = z.object({ productId: z.string().uuid("ID sản phẩm không hợp lệ") });

async function getCart(userId: string) {
  const items = await query(
    `SELECT ci.id, ci.product_id, p.name, p.price::float AS price, p.image_url, p.stock, ci.quantity,
            (p.price * ci.quantity)::float AS line_total,
            (p.is_active AND p.stock >= ci.quantity) AS available
     FROM cart_items ci JOIN products p ON p.id = ci.product_id
     WHERE ci.user_id = $1
     ORDER BY ci.created_at`,
    [userId]
  );
  const total = items.reduce((sum, i) => sum + i.line_total, 0);
  return { items, total, itemCount: items.length };
}

async function assertStock(productId: string, quantity: number) {
  const rows = await query<{ stock: number; is_active: boolean }>(
    "SELECT stock, is_active FROM products WHERE id = $1",
    [productId]
  );
  const p = rows[0];
  if (!p || !p.is_active) throw new HttpError(404, "Sản phẩm không tồn tại hoặc đã ngừng bán");
  if (quantity > p.stock) throw new HttpError(400, `Chỉ còn ${p.stock} sản phẩm trong kho`);
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await getCart(req.user!.id));
  })
);

router.post(
  "/items",
  validate(addSchema),
  asyncHandler(async (req, res) => {
    const { productId, quantity } = req.body;
    const current = await query<{ quantity: number }>(
      "SELECT quantity FROM cart_items WHERE user_id = $1 AND product_id = $2",
      [req.user!.id, productId]
    );
    await assertStock(productId, (current[0]?.quantity ?? 0) + quantity);
    await query(
      `INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity`,
      [req.user!.id, productId, quantity]
    );
    res.status(201).json(await getCart(req.user!.id));
  })
);

router.patch(
  "/items/:productId",
  validate(productParam, "params"),
  validate(qtySchema),
  asyncHandler(async (req, res) => {
    await assertStock(req.params.productId, req.body.quantity);
    const rows = await query(
      "UPDATE cart_items SET quantity = $3 WHERE user_id = $1 AND product_id = $2 RETURNING id",
      [req.user!.id, req.params.productId, req.body.quantity]
    );
    if (!rows[0]) throw new HttpError(404, "Sản phẩm không có trong giỏ hàng");
    res.json(await getCart(req.user!.id));
  })
);

router.delete(
  "/items/:productId",
  validate(productParam, "params"),
  asyncHandler(async (req, res) => {
    await query("DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2", [req.user!.id, req.params.productId]);
    res.json(await getCart(req.user!.id));
  })
);

router.delete(
  "/",
  asyncHandler(async (req, res) => {
    await query("DELETE FROM cart_items WHERE user_id = $1", [req.user!.id]);
    res.json(await getCart(req.user!.id));
  })
);

export default router;
