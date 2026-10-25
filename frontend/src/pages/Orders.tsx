import { useState } from "react";
import { useLocation } from "react-router-dom";
import { api, dateTime, errMsg, money, Order, Page, STATUS } from "../api";
import { Msg, Pagination, State, useLoad } from "../components";

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
      {list.data?.items.map((o) => (
        <div key={o.id} className="box">
          <div className="row between" onClick={() => view(o.id)} style={{ cursor: "pointer" }}>
            <span>#{o.id.slice(0, 8)} · {dateTime(o.created_at)} · {o.item_count} sản phẩm</span>
            <span><span className={`tag ${o.status}`}>{STATUS[o.status]}</span> <b>{money(o.total_amount)}</b></span>
          </div>
          {open?.id === o.id && (
            <div>
              <p className="muted">Giao đến: {open.shipping_name} · {open.shipping_phone} · {open.shipping_address}</p>
              {open.items?.map((i) => <div key={i.product_id} className="row between"><span>{i.name} × {i.quantity}</span><span>{money(i.line_total)}</span></div>)}
              {open.status === "pending" && <button className="link" onClick={() => cancel(o.id)}>Hủy đơn</button>}
            </div>
          )}
        </div>
      ))}
      {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} onChange={setPage} />}
    </>
  );
}
