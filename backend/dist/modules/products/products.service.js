"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRODUCT_COLS = void 0;
exports.list = list;
exports.getDetail = getDetail;
exports.create = create;
exports.update = update;
exports.remove = remove;
const pool_1 = require("../../db/pool");
const common_1 = require("../../utils/common");
const httpError_1 = require("../../utils/httpError");
const RATING = `
  (SELECT ROUND(AVG(r.rating)::numeric, 1)::float FROM reviews r WHERE r.product_id = p.id) AS avg_rating,
  (SELECT COUNT(*)::int FROM reviews r WHERE r.product_id = p.id) AS review_count`;
exports.PRODUCT_COLS = `
  p.id, p.category_id, c.name AS category_name, p.name, p.description,
  p.price::float AS price, p.stock, p.image_url, p.view_count, p.sold_count,
  p.is_active, p.created_at, ${RATING}`;
async function list(q, isAdmin) {
    const where = [];
    const params = [];
    const add = (sql, value) => {
        params.push(value);
        where.push(sql.replace("?", `$${params.length}`));
    };
    if (!(isAdmin && q.includeInactive))
        where.push("p.is_active = TRUE");
    if (q.q)
        add("p.name ILIKE ?", `%${q.q.replace(/[\\%_]/g, "\\$&")}%`);
    if (q.categoryId)
        add("p.category_id = ?", q.categoryId);
    if (q.minPrice !== undefined)
        add("p.price >= ?", q.minPrice);
    if (q.maxPrice !== undefined)
        add("p.price <= ?", q.maxPrice);
    if (q.inStock)
        where.push("p.stock > 0");
    const orderBy = {
        newest: "p.created_at DESC",
        price_asc: "p.price ASC",
        price_desc: "p.price DESC",
        popular: "(p.sold_count * 2 + p.view_count * 0.2) DESC, p.created_at DESC",
    }[q.sort];
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const total = (await (0, pool_1.query)(`SELECT COUNT(*)::int AS n FROM products p ${whereSql}`, params))[0].n;
    const offset = (q.page - 1) * q.limit;
    const items = await (0, pool_1.query)(`SELECT ${exports.PRODUCT_COLS}
     FROM products p JOIN categories c ON c.id = p.category_id
     ${whereSql}
     ORDER BY ${orderBy}
     LIMIT ${q.limit} OFFSET ${offset}`, params);
    return (0, common_1.buildPage)(items, total, q.page, q.limit);
}
async function findOne(id, includeInactive) {
    const rows = await (0, pool_1.query)(`SELECT ${exports.PRODUCT_COLS} FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = $1`, [id]);
    const p = rows[0];
    if (!p || (!p.is_active && !includeInactive))
        throw new httpError_1.HttpError(404, "Không tìm thấy sản phẩm");
    return p;
}
// Xem chi tiết: tăng lượt xem và ghi lịch sử xem (phục vụ gợi ý)
async function getDetail(id, userId, isAdmin = false) {
    const product = await findOne(id, isAdmin);
    await (0, pool_1.query)("UPDATE products SET view_count = view_count + 1 WHERE id = $1", [id]);
    if (userId) {
        // Không ghi lại nếu vừa xem cùng sản phẩm trong 10 phút gần nhất
        await (0, pool_1.query)(`INSERT INTO product_views (user_id, product_id)
       SELECT $1, $2
       WHERE NOT EXISTS (
         SELECT 1 FROM product_views
         WHERE user_id = $1 AND product_id = $2 AND viewed_at > NOW() - INTERVAL '10 minutes'
       )`, [userId, id]);
    }
    return product;
}
async function create(input) {
    const rows = await (0, pool_1.query)(`INSERT INTO products (category_id, name, description, price, stock, image_url)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`, [input.categoryId, input.name, input.description ?? null, input.price, input.stock, input.imageUrl ?? null]);
    return findOne(rows[0].id, true);
}
const COLUMN_MAP = {
    categoryId: "category_id",
    name: "name",
    description: "description",
    price: "price",
    stock: "stock",
    imageUrl: "image_url",
    isActive: "is_active",
};
async function update(id, input) {
    const sets = [];
    const params = [];
    for (const key of Object.keys(COLUMN_MAP)) {
        if (input[key] !== undefined) {
            params.push(input[key]);
            sets.push(`${COLUMN_MAP[key]} = $${params.length}`);
        }
    }
    params.push(id);
    const rows = await (0, pool_1.query)(`UPDATE products SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING id`, params);
    if (!rows[0])
        throw new httpError_1.HttpError(404, "Không tìm thấy sản phẩm");
    return findOne(id, true);
}
// Xóa mềm để không làm hỏng lịch sử đơn hàng
async function remove(id) {
    const rows = await (0, pool_1.query)("UPDATE products SET is_active = FALSE WHERE id = $1 RETURNING id", [id]);
    if (!rows[0])
        throw new httpError_1.HttpError(404, "Không tìm thấy sản phẩm");
}
