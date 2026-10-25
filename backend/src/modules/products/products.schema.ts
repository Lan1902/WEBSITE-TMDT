import { z } from "zod";
import { paginationShape } from "../../utils/common";

const boolFlag = z
  .enum(["true", "false"])
  .transform((v) => v === "true")
  .optional();

export const listQuerySchema = z.object({
  ...paginationShape,
  q: z.string().trim().max(100).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "popular"]).default("newest"),
  inStock: boolFlag,
  includeInactive: boolFlag, // chỉ có tác dụng với admin
});
export type ListQuery = z.infer<typeof listQuerySchema>;

export const productBodySchema = z.object({
  categoryId: z.number().int().positive("Danh mục không hợp lệ"),
  name: z.string().trim().min(2, "Tên sản phẩm quá ngắn").max(200),
  description: z.string().trim().max(5000).optional(),
  price: z.number().min(0, "Giá không hợp lệ").max(9_999_999_999),
  stock: z.number().int().min(0, "Tồn kho không hợp lệ").max(1_000_000),
  imageUrl: z.string().trim().url("URL ảnh không hợp lệ").max(1000).optional(),
});

export const productUpdateSchema = productBodySchema
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine((o) => Object.keys(o).length > 0, "Không có dữ liệu để cập nhật");

export type ProductBody = z.infer<typeof productBodySchema>;
export type ProductUpdate = z.infer<typeof productUpdateSchema>;
