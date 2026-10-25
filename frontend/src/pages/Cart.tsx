import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, Cart as CartT, errMsg, money } from "../api";
import { Msg, State, Thumb, useLoad } from "../components";
import { useStore } from "../store";

export default function Cart() {
  const { user, refreshCart } = useStore();
  const nav = useNavigate();
  const cart = useLoad(() => api<CartT>("/cart"), []);
  const [error, setError] = useState("");

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      setError("");
    } catch (e) {
      setError(errMsg(e));
    }
    cart.reload();
    refreshCart();
  };

  const checkout = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await api("/orders", {
        method: "POST",
        body: {
          shippingName: f.get("shippingName"),
          shippingPhone: f.get("shippingPhone"),
          shippingAddress: f.get("shippingAddress"),
          note: String(f.get("note") || "") || undefined,
        },
      });
      await refreshCart();
      nav("/orders", { state: { placed: true } });
    } catch (er) {
      setError(errMsg(er));
    }
  };

  if (!cart.data) return <State loading={cart.loading} error={cart.error} />;
  if (!cart.data.items.length) return <p>Giỏ hàng trống. <Link to="/products">Tiếp tục mua sắm</Link></p>;

  return (
    <>
      <h2>Giỏ hàng</h2>
      {cart.data.items.map((i) => (
        <div key={i.id} className="line">
          <Thumb src={i.image_url} name={i.name} />
          <div className="grow">
            <Link to={`/products/${i.product_id}`}><b>{i.name}</b></Link>
            <div>{money(i.price)}</div>
            {!i.available && <small className="err">Không đủ hàng (còn {i.stock})</small>}
          </div>
          <input type="number" min={1} max={i.stock} defaultValue={i.quantity} style={{ width: 70 }}
            onBlur={(e) => Number(e.target.value) !== i.quantity && act(() => api(`/cart/items/${i.product_id}`, { method: "PATCH", body: { quantity: Math.max(1, Number(e.target.value)) } }))} />
          <b>{money(i.line_total)}</b>
          <button className="link" onClick={() => act(() => api(`/cart/items/${i.product_id}`, { method: "DELETE" }))}>Xóa</button>
        </div>
      ))}
      <p className="total">Tổng cộng: <b className="price big">{money(cart.data.total)}</b></p>

      <h3>Thông tin giao hàng</h3>
      <form className="box form" onSubmit={checkout}>
        <input name="shippingName" placeholder="Họ tên người nhận" defaultValue={user?.full_name} required minLength={2} />
        <input name="shippingPhone" placeholder="Số điện thoại" defaultValue={user?.phone} required />
        <input name="shippingAddress" placeholder="Địa chỉ giao hàng" defaultValue={user?.address} required minLength={5} />
        <textarea name="note" placeholder="Ghi chú (không bắt buộc)" rows={2} />
        <Msg error={error} />
        <button className="primary" disabled={cart.data.items.some((i) => !i.available)}>Đặt hàng</button>
      </form>
    </>
  );
}
