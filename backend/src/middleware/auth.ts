import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { query } from "../db/pool";
import { HttpError } from "../utils/httpError";

export type Role = "customer" | "admin";
export interface AuthUser {
  id: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Bắt buộc đăng nhập
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new HttpError(401, "Chưa đăng nhập");

    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(header.slice(7), env.JWT_SECRET) as jwt.JwtPayload;
    } catch {
      throw new HttpError(401, "Token không hợp lệ hoặc đã hết hạn");
    }

    // Kiểm tra tài khoản còn tồn tại và chưa bị khóa; lấy role mới nhất từ DB
    const rows = await query<{ id: string; role: Role; is_active: boolean }>(
      "SELECT id, role, is_active FROM users WHERE id = $1",
      [payload.sub]
    );
    const u = rows[0];
    if (!u || !u.is_active) throw new HttpError(401, "Tài khoản không tồn tại hoặc đã bị khóa");

    req.user = { id: u.id, role: u.role };
    next();
  } catch (e) {
    next(e);
  }
}

// Không bắt buộc đăng nhập: có token hợp lệ thì gắn user, không thì bỏ qua (dùng cho xem sản phẩm, gợi ý)
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.headers.authorization) return next();
  return authenticate(req, res, () => next());
}

// Phân quyền theo vai trò
export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new HttpError(401, "Chưa đăng nhập"));
    if (!roles.includes(req.user.role)) return next(new HttpError(403, "Bạn không có quyền thực hiện thao tác này"));
    next();
  };
