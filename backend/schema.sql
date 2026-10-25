-- =====================================================
-- E-COMMERCE DATABASE SCHEMA (PostgreSQL / Supabase)
-- Chạy toàn bộ file này trong Supabase > SQL Editor
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------- ENUM ----------
CREATE TYPE user_role AS ENUM ('customer', 'admin');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'shipping', 'delivered', 'cancelled');

-- ---------- USERS ----------
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(100) NOT NULL,
    phone         VARCHAR(20),
    address       TEXT,
    role          user_role NOT NULL DEFAULT 'customer',
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- CATEGORIES ----------
CREATE TABLE categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    slug        VARCHAR(120) NOT NULL UNIQUE,
    description TEXT
);

-- ---------- PRODUCTS ----------
CREATE TABLE products (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id   INT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name          VARCHAR(200) NOT NULL,
    description   TEXT,
    price         NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    stock         INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image_url     TEXT,
    view_count    INT NOT NULL DEFAULT 0,
    sold_count    INT NOT NULL DEFAULT 0,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_name ON products USING gin (to_tsvector('simple', name));

-- ---------- CART ----------
CREATE TABLE cart_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity    INT NOT NULL CHECK (quantity > 0),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, product_id)
);

-- ---------- ORDERS ----------
CREATE TABLE orders (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status           order_status NOT NULL DEFAULT 'pending',
    total_amount     NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
    shipping_name    VARCHAR(100) NOT NULL,
    shipping_phone   VARCHAR(20) NOT NULL,
    shipping_address TEXT NOT NULL,
    note             TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_orders_user ON orders(user_id);

CREATE TABLE order_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity    INT NOT NULL CHECK (quantity > 0),
    unit_price  NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0)  -- giá tại thời điểm mua
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ---------- REVIEWS ----------
CREATE TABLE reviews (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, product_id)  -- mỗi người đánh giá một sản phẩm một lần
);
CREATE INDEX idx_reviews_product ON reviews(product_id);

-- ---------- PRODUCT VIEWS (lịch sử xem, phục vụ gợi ý) ----------
CREATE TABLE product_views (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    viewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_views_user_time ON product_views(user_id, viewed_at DESC);

-- ---------- TỰ ĐỘNG CẬP NHẬT updated_at ----------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_orders_updated   BEFORE UPDATE ON orders   FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- DỮ LIỆU MẪU ----------
INSERT INTO categories (name, slug) VALUES
    ('Điện thoại', 'dien-thoai'),
    ('Laptop', 'laptop'),
    ('Phụ kiện', 'phu-kien'),
    ('Thời trang', 'thoi-trang');

-- Tài khoản admin sẽ được tạo bằng script seed của back-end (băm mật khẩu bằng bcrypt),
-- không chèn mật khẩu thô vào SQL.

-- =====================================================
-- GỢI Ý SẢN PHẨM (tham khảo, sẽ dùng trong API)
-- Điểm = (cùng danh mục với sản phẩm user đã xem gần đây) + độ phổ biến
--
-- SELECT p.*,
--        (CASE WHEN p.category_id IN (
--              SELECT DISTINCT pr.category_id
--              FROM product_views v JOIN products pr ON pr.id = v.product_id
--              WHERE v.user_id = $1
--              ORDER BY 1 LIMIT 5) THEN 50 ELSE 0 END)
--        + LEAST(p.sold_count * 2 + p.view_count * 0.2, 50) AS score
-- FROM products p
-- WHERE p.is_active AND p.stock > 0
--   AND p.id NOT IN (SELECT product_id FROM product_views WHERE user_id = $1)
-- ORDER BY score DESC
-- LIMIT 8;
-- =====================================================
