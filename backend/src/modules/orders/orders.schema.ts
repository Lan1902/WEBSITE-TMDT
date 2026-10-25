import { z } from "zod";
import { paginationShape } from "../../utils/common";

export const checkoutSchema = z.object({
  shippingName: z.string().trim().min(2, "Họ tên người nhận quá ngắn").max(100),
  shippingPhone: z.string().trim().regex(/^[0-9+\-\s]{8,20}$/, "Số điện thoại không hợp lệ"),
  shippingAddress: z.string().trim().min(5, "Địa chỉ quá ngắn").max(500),
  note: z.string().trim().max(500).optional(),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const ORDER_STATUSES = ["pending", "confirmed", "shipping", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const statusBodySchema = z.object({ status: z.enum(ORDER_STATUSES) });

export const orderListQuerySchema = z.object({
  ...paginationShape,
  status: z.enum(ORDER_STATUSES).optional(),
});
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;
