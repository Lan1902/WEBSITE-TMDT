import { withTransaction, query } from "../../db/pool";
import { buildPage } from "../../utils/common";
import { HttpError } from "../../utils/httpError";
import { CheckoutInput, OrderStatus } from "./orders.schema";

// Luồng trạng thái hợp lệ do admin điều khiển
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipping", "cancelled"],
  shipping: ["delivered"],
  delivered: [],
  cancelled: [],
};

export interface Actor {
  id: string;
  role: "customer" | "admin";
}

// Đặt hàng từ giỏ: khóa dòng sản phẩm, kiểm tra tồn kho, trừ kho, tạo đơn, xóa giỏ (một transaction)
export function checkout(userId: string, input: CheckoutInput) {
  return withTransaction(async (c) => {
    const { rows: items } = await c.query(
      `SELECT ci.product_id, ci.quantity, p.name, p.price, p.stock, p.is_active
       FROM cart_items ci JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = $1
       ORDER BY ci.product_id
       FOR UPDATE OF p`,
      [userId]
    );
    if (!items.length) throw new HttpError(400, "Giỏ hàng trống");

    for (const i of items) {
      if (!i.is_active) throw new HttpError(400, `Sản phẩm "${i.name}" đã ngừng bán`);
      if (i.quantity > i.stock) throw new HttpError(400, `Sản phẩm "${i.name}" chỉ còn ${i.stock} trong kho`);
    }

    const { rows } = await c.query(
      `INSERT INTO orders (user_id, total_amount, shipping_name, shipping_phone, shipping_address, note)
       VALUES ($1, 0, $2, $3, $4, $5) RETURNING id`,
      [userId, input.shippingName, input.shippingPhone, input.shippingAddress, input.note ?? null]
    );
    const orderId = rows[0].id as string;

    for (const i of items) {
      await c.query(
        "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)",
        [orderId, i.product_id, i.quantity, i.price]
      );
      await c.query("UPDATE products SET stock = stock - $2 WHERE id = $1", [i.product_id, i.quantity]);
    }
    // Tổng tiền tính bằng SQL để tránh sai số số thực
    await c.query(
      "UPDATE orders SET total_amount = (SELECT SUM(quantity * unit_price) FROM order_items WHERE order_id = $1) WHERE id = $1",
      [orderId]
    );
    await c.query("DELETE FROM cart_items WHERE user_id = $1", [userId]);
    return { id: orderId, status: "pending" as OrderStatus };
  });
}

// Đổi trạng thái đơn. Khách chỉ được hủy đơn của mình khi đang pending; admin theo TRANSITIONS.
export function changeStatus(orderId: string, next: OrderStatus, actor: Actor) {
  return withTransaction(async (c) => {
    const { rows } = await c.query("SELECT id, user_id, status FROM orders WHERE id = $1 FOR UPDATE", [orderId]);
    const order = rows[0];
    if (!order) throw new HttpError(404, "Không tìm thấy đơn hàng");

    if (actor.role !== "admin") {
      if (order.user_id !== actor.id) throw new HttpError(404, "Không tìm thấy đơn hàng");
      if (!(order.status === "pending" && next === "cancelled"))
        throw new HttpError(400, "Chỉ có thể hủy đơn đang chờ xác nhận");
    }
    if (!TRANSITIONS[order.status as OrderStatus].includes(next))
      throw new HttpError(400, `Không thể chuyển từ "${order.status}" sang "${next}"`);

    if (next === "cancelled") {
      await c.query(
        `UPDATE products p SET stock = p.stock + oi.quantity
         FROM order_items oi WHERE oi.order_id = $1 AND oi.product_id = p.id`,
        [orderId]
      );
    }
    if (next === "delivered") {
      await c.query(
        `UPDATE products p SET sold_count = p.sold_count + oi.quantity
         FROM order_items oi WHERE oi.order_id = $1 AND oi.product_id = p.id`,
        [orderId]
      );
    }
    await c.query("UPDATE orders SET status = $2 WHERE id = $1", [orderId, next]);
    return { id: orderId, status: next };
  });
}

const ORDER_COLS = `o.id, o.status, o.total_amount::float AS total_amount, o.shipping_name, o.shipping_phone,
  o.shipping_address, o.note, o.created_at, o.updated_at,
  (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS item_count`;

export async function listMine(userId: string, page: number, limit: number) {
  const total = (await query<{ n: number }>("SELECT COUNT(*)::int AS n FROM orders WHERE user_id = $1", [userId]))[0].n;
  const items = await query(
    `SELECT ${ORDER_COLS} FROM orders o WHERE o.user_id = $1
     ORDER BY o.created_at DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
    [userId]
  );
  return buildPage(items, total, page, limit);
}

export async function listAll(status: OrderStatus | undefined, page: number, limit: number) {
  const params: unknown[] = status ? [status] : [];
  const where = status ? "WHERE o.status = $1" : "";
  const total = (await query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM orders o ${where}`, params))[0].n;
  const items = await query(
    `SELECT ${ORDER_COLS}, u.email AS user_email, u.full_name AS user_name
     FROM orders o JOIN users u ON u.id = o.user_id ${where}
     ORDER BY o.created_at DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
    params
  );
  return buildPage(items, total, page, limit);
}

export async function getById(orderId: string, actor: Actor) {
  const rows = await query(
    `SELECT ${ORDER_COLS}, o.user_id, u.email AS user_email, u.full_name AS user_name
     FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = $1`,
    [orderId]
  );
  const order = rows[0];
  if (!order || (actor.role !== "admin" && order.user_id !== actor.id)) throw new HttpError(404, "Không tìm thấy đơn hàng");

  const items = await query(
    `SELECT oi.product_id, p.name, p.image_url, oi.quantity, oi.unit_price::float AS unit_price,
            (oi.quantity * oi.unit_price)::float AS line_total
     FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = $1`,
    [orderId]
  );
  return { ...order, items };
}
