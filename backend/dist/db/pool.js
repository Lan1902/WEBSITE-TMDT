"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = exports.pool = void 0;
exports.withTransaction = withTransaction;
const pg_1 = require("pg");
const env_1 = require("../config/env");
// Supabase yêu cầu SSL
exports.pool = new pg_1.Pool({
    connectionString: env_1.env.DATABASE_URL,
    ssl: env_1.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
    max: 10,
});
const query = (text, params) => exports.pool.query(text, params).then((r) => r.rows);
exports.query = query;
// Chạy nhiều câu lệnh trong một transaction; lỗi thì ROLLBACK
async function withTransaction(fn) {
    const client = await exports.pool.connect();
    try {
        await client.query("BEGIN");
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
    }
    catch (e) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw e;
    }
    finally {
        client.release();
    }
}
