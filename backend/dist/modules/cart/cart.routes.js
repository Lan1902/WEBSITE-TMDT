"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const pool_1 = require("../../db/pool");
const httpError_1 = require("../../utils/httpError");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
const addSchema = zod_1.z.object({
    productId: zod_1.z.string().uuid("ID sản phẩm không hợp lệ"),
    quantity: zod_1.z.number().int().min(1).max(100).default(1),
});
const qtySchema = zod_1.z.object({ quantity: zod_1.z.number().int().min(1).max(100) });
const productParam = zod_1.z.object({ productId: zod_1.z.string().uuid("ID sản phẩm không hợp lệ") });
async function getCart(userId) {
    const items = await (0, pool_1.query)(`SELECT ci.id, ci.product_id, p.name, p.price::float AS price, p.image_url, p.stock, ci.quantity,
            (p.price * ci.quantity)::float AS line_total,
            (p.is_active AND p.stock >= ci.quantity) AS available
     FROM cart_items ci JOIN products p ON p.id = ci.product_id
     WHERE ci.user_id = $1
     ORDER BY ci.created_at`, [userId]);
    const total = items.reduce((sum, i) => sum + i.line_total, 0);
    return { items, total, itemCount: items.length };
}
async function assertStock(productId, quantity) {
    const rows = await (0, pool_1.query)("SELECT stock, is_active FROM products WHERE id = $1", [productId]);
    const p = rows[0];
    if (!p || !p.is_active)
        throw new httpError_1.HttpError(404, "Sản phẩm không tồn tại hoặc đã ngừng bán");
    if (quantity > p.stock)
        throw new httpError_1.HttpError(400, `Chỉ còn ${p.stock} sản phẩm trong kho`);
}
router.get("/", (0, httpError_1.asyncHandler)(async (req, res) => {
    res.json(await getCart(req.user.id));
}));
router.post("/items", (0, validate_1.validate)(addSchema), (0, httpError_1.asyncHandler)(async (req, res) => {
    const { productId, quantity } = req.body;
    const current = await (0, pool_1.query)("SELECT quantity FROM cart_items WHERE user_id = $1 AND product_id = $2", [req.user.id, productId]);
    await assertStock(productId, (current[0]?.quantity ?? 0) + quantity);
    await (0, pool_1.query)(`INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity`, [req.user.id, productId, quantity]);
    res.status(201).json(await getCart(req.user.id));
}));
router.patch("/items/:productId", (0, validate_1.validate)(productParam, "params"), (0, validate_1.validate)(qtySchema), (0, httpError_1.asyncHandler)(async (req, res) => {
    await assertStock(req.params.productId, req.body.quantity);
    const rows = await (0, pool_1.query)("UPDATE cart_items SET quantity = $3 WHERE user_id = $1 AND product_id = $2 RETURNING id", [req.user.id, req.params.productId, req.body.quantity]);
    if (!rows[0])
        throw new httpError_1.HttpError(404, "Sản phẩm không có trong giỏ hàng");
    res.json(await getCart(req.user.id));
}));
router.delete("/items/:productId", (0, validate_1.validate)(productParam, "params"), (0, httpError_1.asyncHandler)(async (req, res) => {
    await (0, pool_1.query)("DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2", [req.user.id, req.params.productId]);
    res.json(await getCart(req.user.id));
}));
router.delete("/", (0, httpError_1.asyncHandler)(async (req, res) => {
    await (0, pool_1.query)("DELETE FROM cart_items WHERE user_id = $1", [req.user.id]);
    res.json(await getCart(req.user.id));
}));
exports.default = router;
