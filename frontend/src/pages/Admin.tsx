import { FormEvent, useState } from "react";
import { api, Category, dateTime, errMsg, money, Order, Page, Product, STATUS, User } from "../api";
import { Msg, Pagination, State, useLoad } from "../components";

export default function Admin() {
  const [tab, setTab] = useState<"products" | "orders" | "users">("products");
  return (
    <>
      <h2>Quản trị</h2>
      <div className="tabs">
        {(["products", "orders", "users"] as const).map((t) => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {{ products: "Sản phẩm", orders: "Đơn hàng", users: "Người dùng" }[t]}
          </button>
        ))}
      </div>
      {tab === "products" && <ProductsTab />}
      {tab === "orders" && <OrdersTab />}
      {tab === "users" && <UsersTab />}
    </>
  );
}

function ProductsTab() {
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<Product | "new" | null>(null);
  const [msg, setMsg] = useState({ error: "", ok: "" });
  const cats = useLoad(() => api<Category[]>("/categories"), []);
  const list = useLoad(() => api<Page<Product>>(`/products?includeInactive=true&sort=newest&limit=10&page=${page}`), [page]);

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      categoryId: Number(f.get("categoryId")),
      name: f.get("name"),
      price: Number(f.get("price")),
      stock: Number(f.get("stock")),
    };
    if (f.get("description")) body.description = f.get("description");
    if (f.get("imageUrl")) body.imageUrl = f.get("imageUrl");
    try {
      if (edit === "new") await api("/products", { method: "POST", body });
      else await api(`/products/${(edit as Product).id}`, { method: "PUT", body });
      setEdit(null);
      setMsg({ error: "", ok: "Đã lưu sản phẩm" });
      list.reload();
    } catch (er) {
      setMsg({ error: errMsg(er), ok: "" });
    }
  };

  const toggle = async (p: Product) => {
    try {
      await api(`/products/${p.id}`, { method: "PUT", body: { isActive: !p.is_active } });
      list.reload();
    } catch (er) {
      setMsg({ error: errMsg(er), ok: "" });
    }
  };

  const cur = edit && edit !== "new" ? edit : undefined;
  return (
    <>
      <button className="primary" onClick={() => setEdit("new")}>+ Thêm sản phẩm</button>
      <Msg error={msg.error} ok={msg.ok} />
      {edit && (
        <form className="box form" onSubmit={save} key={cur?.id ?? "new"}>
          <input name="name" placeholder="Tên sản phẩm" defaultValue={cur?.name} required minLength={2} />
          <select name="categoryId" defaultValue={cur?.category_id} required>
            {cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input name="price" type="number" min="0" placeholder="Giá (₫)" defaultValue={cur?.price} required />
          <input name="stock" type="number" min="0" placeholder="Tồn kho" defaultValue={cur?.stock} required />
          <input name="imageUrl" type="url" placeholder="URL ảnh (https://...)" defaultValue={cur?.image_url} />
          <textarea name="description" placeholder="Mô tả" rows={3} defaultValue={cur?.description} />
          <div className="row"><button className="primary">Lưu</button><button type="button" onClick={() => setEdit(null)}>Hủy</button></div>
        </form>
      )}
      <State loading={list.loading} error={list.error} />
      <div className="scroll">
        <table className="tbl">
          <thead><tr><th>Tên</th><th>Danh mục</th><th>Giá</th><th>Kho</th><th>Trạng thái</th><th /></tr></thead>
          <tbody>
            {list.data?.items.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td><td>{p.category_name}</td><td>{money(p.price)}</td><td>{p.stock}</td>
                <td>{p.is_active ? "Đang bán" : "Đã ẩn"}</td>
                <td><button className="link" onClick={() => { setEdit(p); window.scrollTo(0, 0); }}>Sửa</button> <button className="link" onClick={() => toggle(p)}>{p.is_active ? "Ẩn" : "Hiện"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} onChange={setPage} />}
    </>
  );
}

const NEXT: Record<string, string[]> = { pending: ["confirmed", "cancelled"], confirmed: ["shipping", "cancelled"], shipping: ["delivered"], delivered: [], cancelled: [] };

function OrdersTab() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const list = useLoad(() => api<Page<Order>>(`/admin/orders?page=${page}&limit=10${status ? `&status=${status}` : ""}`), [page, status]);

  const change = async (id: string, next: string) => {
    try {
      await api(`/admin/orders/${id}/status`, { method: "PATCH", body: { status: next } });
      setError("");
    } catch (e) {
      setError(errMsg(e));
    }
    list.reload();
  };

  return (
    <>
      <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
        <option value="">Tất cả trạng thái</option>
        {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <Msg error={error} />
      <State loading={list.loading} error={list.error} />
      <div className="scroll">
        <table className="tbl">
          <thead><tr><th>Mã</th><th>Khách hàng</th><th>Giao đến</th><th>Tổng</th><th>Ngày</th><th>Trạng thái</th></tr></thead>
          <tbody>
            {list.data?.items.map((o) => (
              <tr key={o.id}>
                <td>#{o.id.slice(0, 8)}</td>
                <td>{o.user_name}<br /><small className="muted">{o.user_email}</small></td>
                <td>{o.shipping_name} · {o.shipping_phone}<br /><small className="muted">{o.shipping_address}</small></td>
                <td>{money(o.total_amount)}</td>
                <td>{dateTime(o.created_at)}</td>
                <td>
                  <span className={`tag ${o.status}`}>{STATUS[o.status]}</span>
                  {!!NEXT[o.status].length && (
                    <select value="" onChange={(e) => e.target.value && change(o.id, e.target.value)}>
                      <option value="">Chuyển...</option>
                      {NEXT[o.status].map((s) => <option key={s} value={s}>{STATUS[s]}</option>)}
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} onChange={setPage} />}
    </>
  );
}

function UsersTab() {
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const list = useLoad(() => api<Page<User>>(`/admin/users?page=${page}&limit=10`), [page]);

  const toggle = async (u: User) => {
    try {
      await api(`/admin/users/${u.id}/status`, { method: "PATCH", body: { isActive: !u.is_active } });
      setError("");
    } catch (e) {
      setError(errMsg(e));
    }
    list.reload();
  };

  return (
    <>
      <Msg error={error} />
      <State loading={list.loading} error={list.error} />
      <div className="scroll">
        <table className="tbl">
          <thead><tr><th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Ngày tạo</th><th>Trạng thái</th></tr></thead>
          <tbody>
            {list.data?.items.map((u) => (
              <tr key={u.id}>
                <td>{u.full_name}</td><td>{u.email}</td><td>{u.role === "admin" ? "Quản trị" : "Khách hàng"}</td>
                <td>{u.created_at && dateTime(u.created_at)}</td>
                <td>
                  {u.is_active ? "Hoạt động" : "Đã khóa"}{" "}
                  {u.role === "customer" && <button className="link" onClick={() => toggle(u)}>{u.is_active ? "Khóa" : "Mở khóa"}</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} onChange={setPage} />}
    </>
  );
}
