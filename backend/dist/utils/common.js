"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugify = exports.intParam = exports.uuidParam = exports.buildPage = exports.paginationShape = void 0;
const zod_1 = require("zod");
exports.paginationShape = {
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(50).default(12),
};
const buildPage = (items, total, page, limit) => ({
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
});
exports.buildPage = buildPage;
exports.uuidParam = zod_1.z.object({ id: zod_1.z.string().uuid("ID không hợp lệ") });
exports.intParam = zod_1.z.object({ id: zod_1.z.coerce.number().int().positive("ID không hợp lệ") });
const slugify = (s) => s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
exports.slugify = slugify;
