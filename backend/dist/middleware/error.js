"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = notFound;
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
const httpError_1 = require("../utils/httpError");
function notFound(_req, res) {
    res.status(404).json({ message: "Không tìm thấy đường dẫn" });
}
function errorHandler(err, _req, res, _next) {
    if (err instanceof httpError_1.HttpError)
        return res.status(err.status).json({ message: err.message });
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({
            message: "Dữ liệu không hợp lệ",
            errors: err.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
        });
    }
    // Lỗi PostgreSQL: vi phạm UNIQUE / FOREIGN KEY / CHECK
    const code = err?.code;
    if (code === "23505")
        return res.status(409).json({ message: "Dữ liệu đã tồn tại" });
    if (code === "23503")
        return res.status(409).json({ message: "Dữ liệu liên quan không hợp lệ hoặc đang được sử dụng" });
    if (code === "23514" || code === "22P02")
        return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    console.error(err);
    res.status(500).json({ message: "Lỗi hệ thống" });
}
