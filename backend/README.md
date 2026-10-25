# E-commerce Backend (Express + TypeScript + PostgreSQL)

## Chạy
1. `npm install`
2. Copy `.env.example` thành `.env` và điền `DATABASE_URL`, `JWT_SECRET`
3. Chạy `schema.sql` trên Supabase (SQL Editor)
4. `npm run seed:admin` rồi `npm run dev`

## API
Dấu 🔒 = cần đăng nhập, 👑 = chỉ admin. Danh sách phân trang trả về `{ items, page, limit, total, totalPages }`.

| Method | Đường dẫn | Mô tả |
|---|---|---|
| POST | /api/auth/register | Đăng ký (customer) |
| POST | /api/auth/login | Đăng nhập, trả về token |
| GET | /api/auth/me 🔒 | Thông tin cá nhân |
| GET | /api/categories | Danh sách danh mục |
| POST/PUT/DELETE | /api/categories(/:id) 👑 | Quản lý danh mục |
| GET | /api/products | Tìm kiếm, lọc (q, categoryId, minPrice, maxPrice, inStock), sắp xếp (sort), phân trang |
| GET | /api/products/:id | Chi tiết (tăng lượt xem, ghi lịch sử xem nếu đã đăng nhập) |
| POST/PUT/DELETE | /api/products(/:id) 👑 | Quản lý sản phẩm (xóa = ẩn sản phẩm) |
| GET | /api/cart 🔒 | Xem giỏ hàng |
| POST | /api/cart/items 🔒 | Thêm vào giỏ `{productId, quantity}` |
| PATCH/DELETE | /api/cart/items/:productId 🔒 | Sửa số lượng / xóa khỏi giỏ |
| DELETE | /api/cart 🔒 | Xóa toàn bộ giỏ |
| POST | /api/orders 🔒 | Đặt hàng từ giỏ (trừ tồn kho trong transaction) |
| GET | /api/orders 🔒 | Đơn hàng của tôi |
| GET | /api/orders/:id 🔒 | Chi tiết đơn |
| POST | /api/orders/:id/cancel 🔒 | Hủy đơn đang chờ xác nhận (hoàn tồn kho) |
| GET | /api/products/:id/reviews | Đánh giá của sản phẩm |
| POST | /api/products/:id/reviews 🔒 | Gửi/sửa đánh giá (phải đã nhận hàng) |
| DELETE | /api/reviews/:id 🔒 | Xóa đánh giá của mình (admin xóa được mọi đánh giá) |
| GET | /api/recommendations | Gợi ý (`?productId=` để lấy sản phẩm tương tự) |
| GET | /api/admin/stats 👑 | Thống kê |
| GET | /api/admin/users 👑 | Danh sách người dùng |
| PATCH | /api/admin/users/:id/status 👑 | Khóa/mở khóa `{isActive}` |
| GET | /api/admin/orders(/:id) 👑 | Danh sách / chi tiết đơn hàng |
| PATCH | /api/admin/orders/:id/status 👑 | Đổi trạng thái đơn |

Luồng trạng thái đơn: pending → confirmed → shipping → delivered; pending/confirmed có thể → cancelled.
