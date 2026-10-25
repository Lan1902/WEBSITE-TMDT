"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const pool_1 = require("./db/pool");
const server = app_1.app.listen(env_1.env.PORT, () => console.log(`API chạy tại http://localhost:${env_1.env.PORT}`));
const shutdown = () => server.close(() => pool_1.pool.end().then(() => process.exit(0)));
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
