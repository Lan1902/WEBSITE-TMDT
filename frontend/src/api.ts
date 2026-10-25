const BASE: string = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export const tokenStore = {
  get: () => localStorage.getItem("token"),
  set: (t: string) => localStorage.setItem("token", t),
  clear: () => localStorage.removeItem("token"),
};

export class ApiError extends Error {
  constructor(public status: number, message: string, public errors?: { field: string; message: string }[]) {
    super(message);
  }
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(BASE + path, {
    method: opts.method ?? "GET",
    headers: {
      ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.message ?? "Có lỗi xảy ra", data.errors);
  return data as T;
}

export const errMsg = (e: unknown) =>
  e instanceof ApiError ? (e.errors?.length ? e.errors.map((x) => x.message).join(". ") : e.message) : "Không kết nối được máy chủ";

export const money = (n: number) => Number(n).toLocaleString("vi-VN") + " ₫";
export const dateTime = (s: string) => new Date(s).toLocaleString("vi-VN");

export const STATUS: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};

export interface User { id: string; email: string; full_name: string; phone?: string; address?: string; role: "customer" | "admin"; is_active?: boolean; created_at?: string }
export interface Category { id: number; name: string; slug: string; product_count: number }
export interface Product {
  id: string; category_id: number; category_name: string; name: string; description?: string; price: number;
  stock: number; image_url?: string; view_count: number; sold_count: number; is_active: boolean;
  avg_rating: number | null; review_count: number;
}
export interface Page<T> { items: T[]; page: number; limit: number; total: number; totalPages: number }
export interface CartItem { id: string; product_id: string; name: string; price: number; image_url?: string; stock: number; quantity: number; line_total: number; available: boolean }
export interface Cart { items: CartItem[]; total: number; itemCount: number }
export interface Order {
  id: string; status: string; total_amount: number; shipping_name: string; shipping_phone: string; shipping_address: string;
  note?: string; created_at: string; item_count: number; user_email?: string; user_name?: string;
  items?: { product_id: string; name: string; quantity: number; unit_price: number; line_total: number }[];
}
export interface Review { id: string; rating: number; comment?: string; created_at: string; user_name: string; is_mine: boolean }
