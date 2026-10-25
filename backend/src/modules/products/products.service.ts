import { query } from "../../db/pool";
import { buildPage } from "../../utils/common";
import { HttpError } from "../../utils/httpError";
import { ListQuery, ProductBody, ProductUpdate } from "./products.schema";

const RATING = `
  (SELECT ROUND(AVG(r.rating)::numeric, 1)::float FROM reviews r WHERE r.product_id = p.id) AS avg_rating,
  (SELECT COUNT(*)::int FROM reviews r WHERE r.product_id = p.id) AS review_count`;

export const PRODUCT_COLS = `
  p.id, p.category_id, c.name AS category_name, p.name, p.description,
  p.price::float AS price, p.stock, p.image_url, p.view_count, p.sold_count,
  p.is_active, p.created_at, ${RATING}`;

export async function list(q: ListQuery, isAdmin: boolean) {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    where.push(sql.replace("?", `$${params.length}`));
  };

  if (!(isAdmin && q.includeInactive)) where.push("p.is_active = TRUE");
  if (q.q) add("p.name ILIKE ?", `%${q.q.replace(/[\\%_]/g, "\\$&")}%`);
  if (q.categoryId) add("p.category_id = ?", q.categoryId);
  if (q.minPrice !== undefined) add("p.price >= ?", q.minPrice);
  if (q.maxPrice !== undefined) add("p.price <= ?", q.maxPrice);
  if (q.inStock) where.push("p.stock > 0");

  const orderBy = {
    newest: "p.created_at DESC",
    price_asc: "p.price ASC",
    price_desc: "p.price DESC",
    popular: "(p.sold_count * 2 + p.view_count * 0.2) DESC, p.created_at DESC",
  }[q.sort];

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = (await query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM products p ${whereSql}`, params))[0].n;

  const offset = (q.page - 1) * q.limit;
  const items = await query(
    `SELECT ${PRODUCT_COLS}
     FROM products p JOIN categories c ON c.id = p.category_id
     ${whereSql}
     ORDER BY ${orderBy}
     LIMIT ${q.limit} OFFSET ${offset}`,
    params
  );
  return buildPage(items, total, q.page, q.limit);
}

async function findOne(id: string, includeInactive: boolean) {
  const rows = await query(
    `SELECT ${PRODUCT_COLS} FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = $1`,
    [id]
  );
  const p = rows[0];
  if (!p || (!p.is_active && !includeInactive)) throw new HttpError(404, "Không tìm thấy sản phẩm");
  return p;
}

// Xem chi tiết: tăng lượt xem và ghi lịch sử xem (phục vụ gợi ý)
export async function getDetail(id: string, userId?: string, isAdmin = false) {
  const product = await findOne(id, isAdmin);
  await query("UPDATE products SET view_count = view_count + 1 WHERE id = $1", [id]);
  if (userId) {
    // Không ghi lại nếu vừa xem cùng sản phẩm trong 10 phút gần nhất
    await query(
      `INSERT INTO product_views (user_id, product_id)
       SELECT $1, $2
       WHERE NOT EXISTS (
         SELECT 1 FROM product_views
         WHERE user_id = $1 AND product_id = $2 AND viewed_at > NOW() - INTERVAL '10 minutes'
       )`,
      [userId, id]
    );
  }
  return product;
}

export async function create(input: ProductBody) {
  const rows = await query(
    `INSERT INTO products (category_id, name, description, price, stock, image_url)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [input.categoryId, input.name, input.description ?? null, input.price, input.stock, input.imageUrl ?? null]
  );
  return findOne(rows[0].id, true);
}

const COLUMN_MAP: Record<keyof ProductUpdate, string> = {
  categoryId: "category_id",
  name: "name",
  description: "description",
  price: "price",
  stock: "stock",
  imageUrl: "image_url",
  isActive: "is_active",
};

export async function update(id: string, input: ProductUpdate) {
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const key of Object.keys(COLUMN_MAP) as (keyof ProductUpdate)[]) {
    if (input[key] !== undefined) {
      params.push(input[key]);
      sets.push(`${COLUMN_MAP[key]} = $${params.length}`);
    }
  }
  params.push(id);
  const rows = await query(`UPDATE products SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING id`, params);
  if (!rows[0]) throw new HttpError(404, "Không tìm thấy sản phẩm");
  return findOne(id, true);
}

// Xóa mềm để không làm hỏng lịch sử đơn hàng
export async function remove(id: string) {
  const rows = await query("UPDATE products SET is_active = FALSE WHERE id = $1 RETURNING id", [id]);
  if (!rows[0]) throw new HttpError(404, "Không tìm thấy sản phẩm");
}
