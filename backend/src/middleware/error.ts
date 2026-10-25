import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/httpError";

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ message: "Không tìm thấy đường dẫn" });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) return res.status(err.status).json({ message: err.message });

  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Dữ liệu không hợp lệ",
      errors: err.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
  }

  // Lỗi PostgreSQL: vi phạm UNIQUE / FOREIGN KEY / CHECK
  const code = (err as any)?.code;
  if (code === "23505") return res.status(409).json({ message: "Dữ liệu đã tồn tại" });
  if (code === "23503") return res.status(409).json({ message: "Dữ liệu liên quan không hợp lệ hoặc đang được sử dụng" });
  if (code === "23514" || code === "22P02") return res.status(400).json({ message: "Dữ liệu không hợp lệ" });

  console.error(err);
  res.status(500).json({ message: "Lỗi hệ thống" });
}
