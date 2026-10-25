"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderListQuerySchema = exports.statusBodySchema = exports.ORDER_STATUSES = exports.checkoutSchema = void 0;
const zod_1 = require("zod");
const common_1 = require("../../utils/common");
exports.checkoutSchema = zod_1.z.object({
    shippingName: zod_1.z.string().trim().min(2, "Họ tên người nhận quá ngắn").max(100),
    shippingPhone: zod_1.z.string().trim().regex(/^[0-9+\-\s]{8,20}$/, "Số điện thoại không hợp lệ"),
    shippingAddress: zod_1.z.string().trim().min(5, "Địa chỉ quá ngắn").max(500),
    note: zod_1.z.string().trim().max(500).optional(),
});
exports.ORDER_STATUSES = ["pending", "confirmed", "shipping", "delivered", "cancelled"];
exports.statusBodySchema = zod_1.z.object({ status: zod_1.z.enum(exports.ORDER_STATUSES) });
exports.orderListQuerySchema = zod_1.z.object({
    ...common_1.paginationShape,
    status: zod_1.z.enum(exports.ORDER_STATUSES).optional(),
});
