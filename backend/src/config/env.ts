import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "Thiếu DATABASE_URL"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET phải dài ít nhất 16 ký tự"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  // Nhiều origin cách nhau bằng dấu phẩy
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

export const env = schema.parse(process.env);
