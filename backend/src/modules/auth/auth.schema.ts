import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email không hợp lệ").max(255),
  password: z
    .string()
    .min(8, "Mật khẩu tối thiểu 8 ký tự")
    .max(72, "Mật khẩu tối đa 72 ký tự")
    .regex(/[A-Za-z]/, "Mật khẩu phải có chữ cái")
    .regex(/[0-9]/, "Mật khẩu phải có chữ số"),
  fullName: z.string().trim().min(2, "Họ tên quá ngắn").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{8,20}$/, "Số điện thoại không hợp lệ")
    .optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
