"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.getProfile = getProfile;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../../config/env");
const pool_1 = require("../../db/pool");
const httpError_1 = require("../../utils/httpError");
const PUBLIC_FIELDS = "id, email, full_name, phone, address, role, created_at";
function signToken(id, role) {
    return jsonwebtoken_1.default.sign({ sub: id, role }, env_1.env.JWT_SECRET, {
        expiresIn: env_1.env.JWT_EXPIRES_IN,
    });
}
async function register(input) {
    const exists = await (0, pool_1.query)("SELECT 1 FROM users WHERE email = $1", [input.email]);
    if (exists.length)
        throw new httpError_1.HttpError(409, "Email đã được đăng ký");
    const hash = await bcryptjs_1.default.hash(input.password, 10);
    // Đăng ký công khai luôn là customer; admin chỉ tạo bằng script seed
    const rows = await (0, pool_1.query)(`INSERT INTO users (email, password_hash, full_name, phone)
     VALUES ($1, $2, $3, $4) RETURNING ${PUBLIC_FIELDS}`, [input.email, hash, input.fullName, input.phone ?? null]);
    const user = rows[0];
    return { user, token: signToken(user.id, user.role) };
}
async function login(input) {
    const rows = await (0, pool_1.query)(`SELECT ${PUBLIC_FIELDS}, password_hash, is_active FROM users WHERE email = $1`, [input.email]);
    const u = rows[0];
    // Cùng một thông báo cho sai email và sai mật khẩu để tránh dò tài khoản
    const ok = u && (await bcryptjs_1.default.compare(input.password, u.password_hash));
    if (!ok)
        throw new httpError_1.HttpError(401, "Email hoặc mật khẩu không đúng");
    if (!u.is_active)
        throw new httpError_1.HttpError(403, "Tài khoản đã bị khóa");
    const { password_hash, is_active, ...user } = u;
    return { user, token: signToken(user.id, user.role) };
}
async function getProfile(userId) {
    const rows = await (0, pool_1.query)(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`, [userId]);
    if (!rows[0])
        throw new httpError_1.HttpError(404, "Không tìm thấy người dùng");
    return rows[0];
}
