import { FormEvent, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, dateTime, errMsg, money, Page, Product, Review } from "../api";
import { Msg, ProductCard, Stars, State, Thumb, useLoad } from "../components";
import { useStore } from "../store";

export default function ProductDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, refreshCart } = useStore();
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState({ error: "", ok: "" });
  const [rvMsg, setRvMsg] = useState("");

  const p = useLoad(() => api<Product>(`/products/${id}`), [id, user?.id]);
  const rv = useLoad(() => api<Page<Review> & { average: number; canReview: boolean }>(`/products/${id}/reviews`), [id, user?.id]);
  const sim = useLoad(() => api<{ items: Product[] }>(`/recommendations?productId=${id}&limit=4`), [id]);

  const addToCart = async () => {
    if (!user) return nav("/login", { state: { from: `/products/${id}` } });
    try {
      await api("/cart/items", { method: "POST", body: { productId: id, quantity: qty } });
      await refreshCart();
      setMsg({ error: "", ok: "Đã thêm vào giỏ hàng" });
    } catch (e) {
      setMsg({ error: errMsg(e), ok: "" });
    }
  };

  const submitReview = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api(`/products/${id}/reviews`, { method: "POST", body: { rating: Number(f.get("rating")), comment: String(f.get("comment") || "") || undefined } });
      setRvMsg("");
      rv.reload();
      p.reload();
    } catch (er) {
      setRvMsg(errMsg(er));
    }
  };

  const delReview = async (rid: string) => {
    await api(`/reviews/${rid}`, { method: "DELETE" });
    rv.reload();
    p.reload();
  };

  if (!p.data) return <State loading={p.loading} error={p.error} />;
  const x = p.data;

  return (
    <>
      <div className="detail">
        <Thumb src={x.image_url} name={x.name} />
        <div>
          <h2>{x.name}</h2>
          <p className="muted">{x.category_name}</p>
          <Stars value={x.avg_rating} /> <small className="muted">({x.review_count} đánh giá · đã bán {x.sold_count})</small>
          <p className="price big">{money(x.price)}</p>
          <p>{x.description}</p>
          <p className="muted">{x.stock > 0 ? `Còn ${x.stock} sản phẩm` : "Hết hàng"}</p>
          {x.stock > 0 && (
            <div className="row">
              <input type="number" min={1} max={x.stock} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} style={{ width: 80 }} />
              <button className="primary" onClick={addToCart}>Thêm vào giỏ</button>
            </div>
          )}
          <Msg error={msg.error} ok={msg.ok} />
        </div>
      </div>

      <h3>Đánh giá</h3>
      {rv.data?.canReview && (
        <form className="box" onSubmit={submitReview}>
          <div className="row">
            <label>Chấm điểm <select name="rating" defaultValue="5">{[5, 4, 3, 2, 1].map((n) => <option key={n}>{n}</option>)}</select></label>
          </div>
          <textarea name="comment" placeholder="Nhận xét của bạn" rows={2} maxLength={2000} />
          <button className="primary">Gửi đánh giá</button>
          <Msg error={rvMsg} />
        </form>
      )}
      {rv.data && !rv.data.items.length && <p className="muted">Chưa có đánh giá nào.</p>}
      {rv.data?.items.map((r) => (
        <div key={r.id} className="box">
          <b>{r.user_name}</b> <Stars value={r.rating} /> <small className="muted">{dateTime(r.created_at)}</small>
          {(r.is_mine || user?.role === "admin") && <button className="link" onClick={() => delReview(r.id)}>Xóa</button>}
          <p>{r.comment}</p>
        </div>
      ))}

      {!!sim.data?.items.length && (
        <>
          <h3>Sản phẩm tương tự</h3>
          <div className="grid">{sim.data.items.map((s) => <ProductCard key={s.id} p={s} />)}</div>
        </>
      )}
    </>
  );
}
