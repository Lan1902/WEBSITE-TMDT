import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { query } from "../../db/pool";
import { HttpError } from "../../utils/httpError";
import { LoginInput, RegisterInput } from "./auth.schema";

const PUBLIC_FIELDS = "id, email, full_name, phone, address, role, created_at";

function signToken(id: string, role: string) {
  return jwt.sign({ sub: id, role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export async function register(input: RegisterInput) {
  const exists = await query("SELECT 1 FROM users WHERE email = $1", [input.email]);
  if (exists.length) throw new HttpError(409, "Email đã được đăng ký");

  const hash = await bcrypt.hash(input.password, 10);
  // Đăng ký công khai luôn là customer; admin chỉ tạo bằng script seed
  const rows = await query(
    `INSERT INTO users (email, password_hash, full_name, phone)
     VALUES ($1, $2, $3, $4) RETURNING ${PUBLIC_FIELDS}`,
    [input.email, hash, input.fullName, input.phone ?? null]
  );
  const user = rows[0];
  return { user, token: signToken(user.id, user.role) };
}

export async function login(input: LoginInput) {
  const rows = await query(
    `SELECT ${PUBLIC_FIELDS}, password_hash, is_active FROM users WHERE email = $1`,
    [input.email]
  );
  const u = rows[0];
  // Cùng một thông báo cho sai email và sai mật khẩu để tránh dò tài khoản
  const ok = u && (await bcrypt.compare(input.password, u.password_hash));
  if (!ok) throw new HttpError(401, "Email hoặc mật khẩu không đúng");
  if (!u.is_active) throw new HttpError(403, "Tài khoản đã bị khóa");

  const { password_hash, is_active, ...user } = u;
  return { user, token: signToken(user.id, user.role) };
}

export async function getProfile(userId: string) {
  const rows = await query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`, [userId]);
  if (!rows[0]) throw new HttpError(404, "Không tìm thấy người dùng");
  return rows[0];
}
