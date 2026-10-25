"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
require("dotenv/config");
const pool_1 = require("../db/pool");
async function main() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password)
        throw new Error("Thiếu ADMIN_EMAIL hoặc ADMIN_PASSWORD trong .env");
    const hash = await bcryptjs_1.default.hash(password, 10);
    await pool_1.pool.query(`INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, 'Quản trị viên', 'admin')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin'`, [email.toLowerCase(), hash]);
    console.log(`Đã tạo/cập nhật admin: ${email}`);
    await pool_1.pool.end();
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
