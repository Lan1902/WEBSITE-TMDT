import { ReactNode, useCallback, useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { errMsg, money, Product } from "./api";
import { useStore } from "./store";

// Tải dữ liệu: trả về data, trạng thái loading, lỗi và hàm reload
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => {
    setLoading(true);
    fn()
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(reload, [reload]);
  return { data, error, loading, reload };
}

export const Stars = ({ value }: { value: number | null }) =>
  value ? <span className="stars">{"★".repeat(Math.round(value))}{"☆".repeat(5 - Math.round(value))} <small>{value}</small></span> : <small className="muted">Chưa có đánh giá</small>;

export function Thumb({ src, name }: { src?: string; name: string }) {
  return src ? <img src={src} alt={name} loading="lazy" /> : <div className="ph">{name.charAt(0).toUpperCase()}</div>;
}

export function ProductCard({ p }: { p: Pick<Product, "id" | "name" | "price" | "image_url" | "avg_rating"> }) {
  return (
    <Link to={`/products/${p.id}`} className="card">
      <Thumb src={p.image_url} name={p.name} />
      <div className="body">
        <div className="name">{p.name}</div>
        <Stars value={p.avg_rating} />
        <b className="price">{money(p.price)}</b>
      </div>
    </Link>
  );
}

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="pager">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)}>‹ Trước</button>
      <span>Trang {page} / {totalPages}</span>
      <button disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Sau ›</button>
    </div>
  );
}

export const Msg = ({ error, ok }: { error?: string; ok?: string }) =>
  error ? <p className="msg err">{error}</p> : ok ? <p className="msg ok">{ok}</p> : null;

export const State = ({ loading, error }: { loading: boolean; error: string }) =>
  loading ? <p className="muted">Đang tải...</p> : error ? <Msg error={error} /> : null;

// Chặn người chưa đăng nhập / không đủ quyền
export function Guard({ admin, children }: { admin?: boolean; children: ReactNode }) {
  const { user, loading } = useStore();
  const loc = useLocation();
  if (loading) return <p className="wrap muted">Đang tải...</p>;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (admin && user.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}
