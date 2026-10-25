import { FormEvent } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import { Guard } from "./components";
import { useStore } from "./store";
import Admin from "./pages/Admin";
import { Login, Register } from "./pages/Auth";
import Cart from "./pages/Cart";
import Home from "./pages/Home";
import Orders from "./pages/Orders";
import ProductDetail from "./pages/ProductDetail";
import Products from "./pages/Products";

function Header() {
  const { user, cartCount, logout } = useStore();
  const nav = useNavigate();
  const search = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    nav(q ? `/products?q=${encodeURIComponent(q)}` : "/products");
  };
  return (
    <header>
      <div className="nav">
        <Link to="/" className="logo">🛍 Shop</Link>
        <form onSubmit={search}>
          <input name="q" placeholder="Tìm sản phẩm..." />
          <button>Tìm</button>
        </form>
        <Link to="/products">Sản phẩm</Link>
        <Link to="/cart">Giỏ hàng{cartCount > 0 && <span className="badge">{cartCount}</span>}</Link>
        {user ? (
          <>
            <Link to="/orders">Đơn hàng</Link>
            {user.role === "admin" && <Link to="/admin">Quản trị</Link>}
            <a href="#" onClick={(e) => { e.preventDefault(); logout(); nav("/"); }}>Đăng xuất ({user.full_name})</a>
          </>
        ) : (
          <>
            <Link to="/login">Đăng nhập</Link>
            <Link to="/register">Đăng ký</Link>
          </>
        )}
      </div>
    </header>
  );
}

export default function App() {
  return (
    <>
      <Header />
      <main className="wrap">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/cart" element={<Guard><Cart /></Guard>} />
          <Route path="/orders" element={<Guard><Orders /></Guard>} />
          <Route path="/admin" element={<Guard admin><Admin /></Guard>} />
          <Route path="*" element={<p>Không tìm thấy trang.</p>} />
        </Routes>
      </main>
    </>
  );
}
