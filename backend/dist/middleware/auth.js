"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = void 0;
exports.authenticate = authenticate;
exports.optionalAuth = optionalAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const pool_1 = require("../db/pool");
const httpError_1 = require("../utils/httpError");
// Bắt buộc đăng nhập
async function authenticate(req, _res, next) {
    try {
        const header = req.headers.authorization;
        if (!header?.startsWith("Bearer "))
            throw new httpError_1.HttpError(401, "Chưa đăng nhập");
        let payload;
        try {
            payload = jsonwebtoken_1.default.verify(header.slice(7), env_1.env.JWT_SECRET);
        }
        catch {
            throw new httpError_1.HttpError(401, "Token không hợp lệ hoặc đã hết hạn");
        }
        // Kiểm tra tài khoản còn tồn tại và chưa bị khóa; lấy role mới nhất từ DB
        const rows = await (0, pool_1.query)("SELECT id, role, is_active FROM users WHERE id = $1", [payload.sub]);
        const u = rows[0];
        if (!u || !u.is_active)
            throw new httpError_1.HttpError(401, "Tài khoản không tồn tại hoặc đã bị khóa");
        req.user = { id: u.id, role: u.role };
        next();
    }
    catch (e) {
        next(e);
    }
}
// Không bắt buộc đăng nhập: có token hợp lệ thì gắn user, không thì bỏ qua (dùng cho xem sản phẩm, gợi ý)
async function optionalAuth(req, res, next) {
    if (!req.headers.authorization)
        return next();
    return authenticate(req, res, () => next());
}
// Phân quyền theo vai trò
const requireRole = (...roles) => (req, _res, next) => {
    if (!req.user)
        return next(new httpError_1.HttpError(401, "Chưa đăng nhập"));
    if (!roles.includes(req.user.role))
        return next(new httpError_1.HttpError(403, "Bạn không có quyền thực hiện thao tác này"));
    next();
};
exports.requireRole = requireRole;
