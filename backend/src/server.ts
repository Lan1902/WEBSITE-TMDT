import { app } from "./app";
import { env } from "./config/env";
import { pool } from "./db/pool";

const server = app.listen(env.PORT, () => console.log(`API chạy tại http://localhost:${env.PORT}`));

const shutdown = () => server.close(() => pool.end().then(() => process.exit(0)));
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
