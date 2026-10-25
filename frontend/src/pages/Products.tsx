import { FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { api, Category, Page, Product } from "../api";
import { Pagination, ProductCard, State, useLoad } from "../components";

export default function Products() {
  const [sp, setSp] = useSearchParams();
  const qs = sp.toString();
  const cats = useLoad(() => api<Category[]>("/categories"), []);
  const list = useLoad(() => api<Page<Product>>(`/products?${qs}${qs ? "&" : ""}limit=12`), [qs]);

  const apply = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next = new URLSearchParams();
    new FormData(e.currentTarget).forEach((v, k) => v && next.set(k, String(v)));
    setSp(next);
  };
  const goPage = (p: number) => {
    const next = new URLSearchParams(sp);
    next.set("page", String(p));
    setSp(next);
  };

  return (
    <>
      <h2>Sản phẩm</h2>
      <form className="filters" onSubmit={apply} key={qs}>
        <input name="q" placeholder="Từ khóa" defaultValue={sp.get("q") ?? ""} />
        <select name="categoryId" defaultValue={sp.get("categoryId") ?? ""}>
          <option value="">Tất cả danh mục</option>
          {cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input name="minPrice" type="number" min="0" placeholder="Giá từ" defaultValue={sp.get("minPrice") ?? ""} />
        <input name="maxPrice" type="number" min="0" placeholder="Giá đến" defaultValue={sp.get("maxPrice") ?? ""} />
        <select name="sort" defaultValue={sp.get("sort") ?? "newest"}>
          <option value="newest">Mới nhất</option>
          <option value="popular">Phổ biến</option>
          <option value="price_asc">Giá tăng dần</option>
          <option value="price_desc">Giá giảm dần</option>
        </select>
        <button>Lọc</button>
      </form>

      <State loading={list.loading} error={list.error} />
      {list.data && !list.data.items.length && <p className="muted">Không có sản phẩm phù hợp.</p>}
      <div className="grid">{list.data?.items.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} onChange={goPage} />}
    </>
  );
}
