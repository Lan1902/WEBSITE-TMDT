import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { query } from "../../db/pool";
import { buildPage, paginationShape, uuidParam } from "../../utils/common";
import { asyncHandler, HttpError } from "../../utils/httpError";
import { OrderListQuery, orderListQuerySchema, statusBodySchema } from "../orders/orders.schema";
import * as orders from "../orders/orders.service";

// Mọi route trong file này yêu cầu quyền admin. Gắn tại /api/admin
const router = Router();
router.use(authenticate, requireRole("admin"));

router.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const totals = (
      await query(
        `SELECT (SELECT COUNT(*)::int FROM users WHERE role = 'customer') AS customers,
                (SELECT COUNT(*)::int FROM products WHERE is_active) AS products,
                (SELECT COUNT(*)::int FROM orders) AS orders,
                (SELECT COALESCE(SUM(total_amount), 0)::float FROM orders WHERE status = 'delivered') AS revenue`
      )
    )[0];
    const ordersByStatus = await query("SELECT status, COUNT(*)::int AS count FROM orders GROUP BY status");
    const topProducts = await query(
      "SELECT id, name, sold_count, view_count FROM products ORDER BY sold_count DESC, view_count DESC LIMIT 5"
    );
    res.json({ ...totals, ordersByStatus, topProducts });
  })
);

// ----- Quản lý người dùng -----
const userListSchema = z.object({ ...paginationShape, q: z.string().trim().max(100).optional() });

router.get(
  "/users",
  validate(userListSchema, "query"),
  asyncHandler(async (req, res) => {
    const { page, limit, q } = req.query as unknown as z.infer<typeof userListSchema>;
    const params: unknown[] = [];
    let where = "";
    if (q) {
      params.push(`%${q.replace(/[\\%_]/g, "\\$&")}%`);
      where = "WHERE email ILIKE $1 OR full_name ILIKE $1";
    }
    const total = (await query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM users ${where}`, params))[0].n;
    const items = await query(
      `SELECT id, email, full_name, phone, role, is_active, created_at FROM users ${where}
       ORDER BY created_at DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      params
    );
    res.json(buildPage(items, total, page, limit));
  })
);

router.patch(
  "/users/:id/status",
  validate(uuidParam, "params"),
  validate(z.object({ isActive: z.boolean() })),
  asyncHandler(async (req, res) => {
    // Không khóa tài khoản admin (kể cả chính mình)
    const rows = await query(
      "UPDATE users SET is_active = $2 WHERE id = $1 AND role = 'customer' RETURNING id, email, is_active",
      [req.params.id, req.body.isActive]
    );
    if (!rows[0]) throw new HttpError(404, "Không tìm thấy người dùng hoặc không thể thay đổi tài khoản này");
    res.json(rows[0]);
  })
);

// ----- Quản lý đơn hàng -----
router.get(
  "/orders",
  validate(orderListQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as OrderListQuery;
    res.json(await orders.listAll(q.status, q.page, q.limit));
  })
);

router.get(
  "/orders/:id",
  validate(uuidParam, "params"),
  asyncHandler(async (req, res) => {
    res.json(await orders.getById(req.params.id, req.user!));
  })
);

router.patch(
  "/orders/:id/status",
  validate(uuidParam, "params"),
  validate(statusBodySchema),
  asyncHandler(async (req, res) => {
    res.json(await orders.changeStatus(req.params.id, req.body.status, req.user!));
  })
);

export default router;
