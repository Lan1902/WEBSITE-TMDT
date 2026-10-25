import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";

// Kiểm tra dữ liệu đầu vào; thay req[part] bằng dữ liệu đã được làm sạch
export const validate =
  (schema: ZodSchema, part: "body" | "query" | "params" = "body") =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) return next(result.error);
    (req as any)[part] = result.data;
    next();
  };
