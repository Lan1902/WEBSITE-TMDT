import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api, dateTime, errMsg, money, Order, Page, STATUS } from "../api";
import { Msg, Pagination, State, Thumb, useLoad } from "../components";

const small = { width: 48, height: 48, objectFit: "cover" as const, borderRadius: 6, border: "1px solid #e5e7eb", flex: "none" as const };

// Ảnh nhỏ của sản phẩm trong danh sách đơn, bấm vào để mở trang sản phẩm
function MiniThumb({ p }: { p: { product_id: string; name: string; image_url?: string | null } }) {
  return (
    <Link to={`/products/${p.product_id}`} title={p.name} onClick={(e) => e.stopPropagation()}>
      {p.image_url ? (
        <img src={p.image_url} alt={p.name} style={small} loading="lazy" />
      ) : (
        <div style={{ ...small, display: "flex", alignItems: "center", justifyContent: "center", background: "#e0e7ff", color: "#2563eb", fontWeight: 700 }}>
          {p.name.charAt(0).toUpperCase()}
        </div>
      )}
    </Link>
  );
}

export default function Orders() {
  const placed = (useLocation().state as { placed?: boolean } | null)?.placed;
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const list = useLoad(() => api<Page<Order>>(`/orders?page=${page}&limit=10`), [page]);

  const view = async (id: string) => {
    if (open?.id === id) return setOpen(null);
    setOpen(await api<Order>(`/orders/${id}`));
  };
  const cancel = async (id: string) => {
    if (!confirm("Hủy đơn hàng này?")) return;
    try {
      await api(`/orders/${id}/cancel`, { method: "POST" });
      setOpen(null);
      list.reload();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <>
      <h2>Đơn hàng của tôi</h2>
      {placed && <Msg ok="Đặt hàng thành công!" />}
      <Msg error={error} />
      <State loading={list.loading} error={list.error} />
      {list.data && !list.data.items.length && <p className="muted">Bạn chưa có đơn hàng nào.</p>}
      {list.data?.items.map((o) => {
        const preview = o.preview ?? [];
        return (
          <div key={o.id} className="box">
            <div className="row between" onClick={() => view(o.id)} style={{ cursor: "pointer" }}>
              <div className="row">
                {preview.map((p) => <MiniThumb key={p.product_id} p={p} />)}
                {o.item_count > preview.length && <small className="muted">+{o.item_count - preview.length}</small>}
                <span>#{o.id.slice(0, 8)} · {dateTime(o.created_at)} · {o.item_count} sản phẩm</span>
              </div>
              <span><span className={`tag ${o.status}`}>{STATUS[o.status]}</span> <b>{money(o.total_amount)}</b></span>
            </div>
            {open?.id === o.id && (
              <div>
                <p className="muted">Giao đến: {open.shipping_name} · {open.shipping_phone} · {open.shipping_address}</p>
                {open.items?.map((i) => (
                  <div key={i.product_id} className="line">
                    <Link to={`/products/${i.product_id}`}><Thumb src={i.image_url ?? undefined} name={i.name} /></Link>
                    <div className="grow">
                      <Link to={`/products/${i.product_id}`}><b>{i.name}</b></Link>
                      <div className="muted">{money(i.unit_price)} × {i.quantity}</div>
                    </div>
                    <b>{money(i.line_total)}</b>
                  </div>
                ))}
                {open.status === "pending" && <button className="link" onClick={() => cancel(o.id)}>Hủy đơn</button>}
              </div>
            )}
          </div>
        );
      })}
      {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} onChange={setPage} />}
    </>
  );
}
