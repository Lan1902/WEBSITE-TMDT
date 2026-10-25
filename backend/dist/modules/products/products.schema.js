"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productUpdateSchema = exports.productBodySchema = exports.listQuerySchema = void 0;
const zod_1 = require("zod");
const common_1 = require("../../utils/common");
const boolFlag = zod_1.z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional();
exports.listQuerySchema = zod_1.z.object({
    ...common_1.paginationShape,
    q: zod_1.z.string().trim().max(100).optional(),
    categoryId: zod_1.z.coerce.number().int().positive().optional(),
    minPrice: zod_1.z.coerce.number().min(0).optional(),
    maxPrice: zod_1.z.coerce.number().min(0).optional(),
    sort: zod_1.z.enum(["newest", "price_asc", "price_desc", "popular"]).default("newest"),
    inStock: boolFlag,
    includeInactive: boolFlag, // chỉ có tác dụng với admin
});
exports.productBodySchema = zod_1.z.object({
    categoryId: zod_1.z.number().int().positive("Danh mục không hợp lệ"),
    name: zod_1.z.string().trim().min(2, "Tên sản phẩm quá ngắn").max(200),
    description: zod_1.z.string().trim().max(5000).optional(),
    price: zod_1.z.number().min(0, "Giá không hợp lệ").max(9999999999),
    stock: zod_1.z.number().int().min(0, "Tồn kho không hợp lệ").max(1000000),
    imageUrl: zod_1.z.string().trim().url("URL ảnh không hợp lệ").max(1000).optional(),
});
exports.productUpdateSchema = exports.productBodySchema
    .partial()
    .extend({ isActive: zod_1.z.boolean().optional() })
    .refine((o) => Object.keys(o).length > 0, "Không có dữ liệu để cập nhật");
