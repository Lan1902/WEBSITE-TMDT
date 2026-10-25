"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkout = checkout;
exports.changeStatus = changeStatus;
exports.listMine = listMine;
exports.listAll = listAll;
exports.getById = getById;
const pool_1 = require("../../db/pool");
const common_1 = require("../../utils/common");
const httpError_1 = require("../../utils/httpError");
// Luồng trạng thái hợp lệ do admin điều khiển
const TRANSITIONS = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["shipping", "cancelled"],
    shipping: ["delivered"],
    delivered: [],
    cancelled: [],
};
// Đặt hàng từ giỏ: khóa dòng sản phẩm, kiểm tra tồn kho, trừ kho, tạo đơn, xóa giỏ (một transaction)
function checkout(userId, input) {
    return (0, pool_1.withTransaction)(async (c) => {
        const { rows: items } = await c.query(`SELECT ci.product_id, ci.quantity, p.name, p.price, p.stock, p.is_active
       FROM cart_items ci JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = $1
       ORDER BY ci.product_id
       FOR UPDATE OF p`, [userId]);
        if (!items.length)
            throw new httpError_1.HttpError(400, "Giỏ hàng trống");
        for (const i of items) {
            if (!i.is_active)
                throw new httpError_1.HttpError(400, `Sản phẩm "${i.name}" đã ngừng bán`);
            if (i.quantity > i.stock)
                throw new httpError_1.HttpError(400, `Sản phẩm "${i.name}" chỉ còn ${i.stock} trong kho`);
        }
        const { rows } = await c.query(`INSERT INTO orders (user_id, total_amount, shipping_name, shipping_phone, shipping_address, note)
       VALUES ($1, 0, $2, $3, $4, $5) RETURNING id`, [userId, input.shippingName, input.shippingPhone, input.shippingAddress, input.note ?? null]);
        const orderId = rows[0].id;
        for (const i of items) {
            await c.query("INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)", [orderId, i.product_id, i.quantity, i.price]);
            await c.query("UPDATE products SET stock = stock - $2 WHERE id = $1", [i.product_id, i.quantity]);
        }
        // Tổng tiền tính bằng SQL để tránh sai số số thực
        await c.query("UPDATE orders SET total_amount = (SELECT SUM(quantity * unit_price) FROM order_items WHERE order_id = $1) WHERE id = $1", [orderId]);
        await c.query("DELETE FROM cart_items WHERE user_id = $1", [userId]);
        return { id: orderId, status: "pending" };
    });
}
// Đổi trạng thái đơn. Khách chỉ được hủy đơn của mình khi đang pending; admin theo TRANSITIONS.
function changeStatus(orderId, next, actor) {
    return (0, pool_1.withTransaction)(async (c) => {
        const { rows } = await c.query("SELECT id, user_id, status FROM orders WHERE id = $1 FOR UPDATE", [orderId]);
        const order = rows[0];
        if (!order)
            throw new httpError_1.HttpError(404, "Không tìm thấy đơn hàng");
        if (actor.role !== "admin") {
            if (order.user_id !== actor.id)
                throw new httpError_1.HttpError(404, "Không tìm thấy đơn hàng");
            if (!(order.status === "pending" && next === "cancelled"))
                throw new httpError_1.HttpError(400, "Chỉ có thể hủy đơn đang chờ xác nhận");
        }
        if (!TRANSITIONS[order.status].includes(next))
            throw new httpError_1.HttpError(400, `Không thể chuyển từ "${order.status}" sang "${next}"`);
        if (next === "cancelled") {
            await c.query(`UPDATE products p SET stock = p.stock + oi.quantity
         FROM order_items oi WHERE oi.order_id = $1 AND oi.product_id = p.id`, [orderId]);
        }
        if (next === "delivered") {
            await c.query(`UPDATE products p SET sold_count = p.sold_count + oi.quantity
         FROM order_items oi WHERE oi.order_id = $1 AND oi.product_id = p.id`, [orderId]);
        }
        await c.query("UPDATE orders SET status = $2 WHERE id = $1", [orderId, next]);
        return { id: orderId, status: next };
    });
}
const ORDER_COLS = `o.id, o.status, o.total_amount::float AS total_amount, o.shipping_name, o.shipping_phone,
  o.shipping_address, o.note, o.created_at, o.updated_at,
  (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS item_count`;
async function listMine(userId, page, limit) {
    const total = (await (0, pool_1.query)("SELECT COUNT(*)::int AS n FROM orders WHERE user_id = $1", [userId]))[0].n;
    const items = await (0, pool_1.query)(`SELECT ${ORDER_COLS} FROM orders o WHERE o.user_id = $1
     ORDER BY o.created_at DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`, [userId]);
    return (0, common_1.buildPage)(items, total, page, limit);
}
async function listAll(status, page, limit) {
    const params = status ? [status] : [];
    const where = status ? "WHERE o.status = $1" : "";
    const total = (await (0, pool_1.query)(`SELECT COUNT(*)::int AS n FROM orders o ${where}`, params))[0].n;
    const items = await (0, pool_1.query)(`SELECT ${ORDER_COLS}, u.email AS user_email, u.full_name AS user_name
     FROM orders o JOIN users u ON u.id = o.user_id ${where}
     ORDER BY o.created_at DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`, params);
    return (0, common_1.buildPage)(items, total, page, limit);
}
async function getById(orderId, actor) {
    const rows = await (0, pool_1.query)(`SELECT ${ORDER_COLS}, o.user_id, u.email AS user_email, u.full_name AS user_name
     FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = $1`, [orderId]);
    const order = rows[0];
    if (!order || (actor.role !== "admin" && order.user_id !== actor.id))
        throw new httpError_1.HttpError(404, "Không tìm thấy đơn hàng");
    const items = await (0, pool_1.query)(`SELECT oi.product_id, p.name, p.image_url, oi.quantity, oi.unit_price::float AS unit_price,
            (oi.quantity * oi.unit_price)::float AS line_total
     FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = $1`, [orderId]);
    return { ...order, items };
}
