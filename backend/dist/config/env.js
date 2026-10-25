"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
const zod_1 = require("zod");
const schema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "production", "test"]).default("development"),
    PORT: zod_1.z.coerce.number().default(4000),
    DATABASE_URL: zod_1.z.string().min(1, "Thiếu DATABASE_URL"),
    JWT_SECRET: zod_1.z.string().min(16, "JWT_SECRET phải dài ít nhất 16 ký tự"),
    JWT_EXPIRES_IN: zod_1.z.string().default("7d"),
    // Nhiều origin cách nhau bằng dấu phẩy
    CORS_ORIGIN: zod_1.z.string().default("http://localhost:5173"),
});
exports.env = schema.parse(process.env);
