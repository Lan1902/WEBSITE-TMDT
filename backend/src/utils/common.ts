import { z } from "zod";

export const paginationShape = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
};

export const buildPage = <T>(items: T[], total: number, page: number, limit: number) => ({
  items,
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

export const uuidParam = z.object({ id: z.string().uuid("ID không hợp lệ") });
export const intParam = z.object({ id: z.coerce.number().int().positive("ID không hợp lệ") });

export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
