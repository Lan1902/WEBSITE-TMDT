import { Link } from "react-router-dom";
import { api, Category, Page, Product } from "../api";
import { ProductCard, State, useLoad } from "../components";
import { useStore } from "../store";

export default function Home() {
  const { user } = useStore();
  const cats = useLoad(() => api<Category[]>("/categories"), []);
  const rec = useLoad(() => api<{ type: string; items: Product[] }>("/recommendations?limit=8"), [user?.id]);
  const latest = useLoad(() => api<Page<Product>>("/products?sort=newest&limit=8"), []);

  return (
    <>
      <div className="chips">
        {cats.data?.map((c) => (
          <Link key={c.id} to={`/products?categoryId=${c.id}`}>{c.name}</Link>
        ))}
      </div>

      <h2>{rec.data?.type === "personalized" ? "Gợi ý dành cho bạn" : "Sản phẩm phổ biến"}</h2>
      <State loading={rec.loading} error={rec.error} />
      <div className="grid">{rec.data?.items.map((p) => <ProductCard key={p.id} p={p} />)}</div>

      <h2>Sản phẩm mới</h2>
      <State loading={latest.loading} error={latest.error} />
      <div className="grid">{latest.data?.items.map((p) => <ProductCard key={p.id} p={p} />)}</div>
    </>
  );
}
