import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { errMsg } from "../api";
import { Msg } from "../components";
import { useStore } from "../store";

function useSubmit(action: (f: FormData) => Promise<void>) {
  const nav = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? "/";
  const [error, setError] = useState("");
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await action(new FormData(e.currentTarget));
      nav(from, { replace: true });
    } catch (er) {
      setError(errMsg(er));
    }
  };
  return { error, submit };
}

export function Login() {
  const { login } = useStore();
  const { error, submit } = useSubmit((f) => login(String(f.get("email")), String(f.get("password"))));
  return (
    <form className="box form narrow" onSubmit={submit}>
      <h2>Đăng nhập</h2>
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Mật khẩu" required />
      <Msg error={error} />
      <button className="primary">Đăng nhập</button>
      <p>Chưa có tài khoản? <Link to="/register">Đăng ký</Link></p>
    </form>
  );
}

export function Register() {
  const { register } = useStore();
  const { error, submit } = useSubmit((f) =>
    register({
      fullName: String(f.get("fullName")),
      email: String(f.get("email")),
      password: String(f.get("password")),
      phone: String(f.get("phone") || "") || undefined,
    })
  );
  return (
    <form className="box form narrow" onSubmit={submit}>
      <h2>Đăng ký</h2>
      <input name="fullName" placeholder="Họ tên" required minLength={2} />
      <input name="email" type="email" placeholder="Email" required />
      <input name="phone" placeholder="Số điện thoại (không bắt buộc)" />
      <input name="password" type="password" placeholder="Mật khẩu (tối thiểu 8 ký tự, có chữ và số)" required minLength={8} />
      <Msg error={error} />
      <button className="primary">Tạo tài khoản</button>
      <p>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
    </form>
  );
}
