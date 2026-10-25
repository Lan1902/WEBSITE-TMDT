"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().trim().toLowerCase().email("Email không hợp lệ").max(255),
    password: zod_1.z
        .string()
        .min(8, "Mật khẩu tối thiểu 8 ký tự")
        .max(72, "Mật khẩu tối đa 72 ký tự")
        .regex(/[A-Za-z]/, "Mật khẩu phải có chữ cái")
        .regex(/[0-9]/, "Mật khẩu phải có chữ số"),
    fullName: zod_1.z.string().trim().min(2, "Họ tên quá ngắn").max(100),
    phone: zod_1.z
        .string()
        .trim()
        .regex(/^[0-9+\-\s]{8,20}$/, "Số điện thoại không hợp lệ")
        .optional(),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().trim().toLowerCase().email("Email không hợp lệ"),
    password: zod_1.z.string().min(1, "Vui lòng nhập mật khẩu"),
});
