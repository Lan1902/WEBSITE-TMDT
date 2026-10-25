import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler, notFound } from "./middleware/error";
import adminRoutes from "./modules/admin/admin.routes";
import authRoutes from "./modules/auth/auth.routes";
import cartRoutes from "./modules/cart/cart.routes";
import categoryRoutes from "./modules/categories/categories.routes";
import orderRoutes from "./modules/orders/orders.routes";
import productRoutes from "./modules/products/products.routes";
import recommendationRoutes from "./modules/recommendations/recommendations.routes";
import reviewRoutes from "./modules/reviews/reviews.routes";

export const app = express();

app.set("trust proxy", 1); // chạy sau proxy của Render
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()) }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", reviewRoutes); // /products/:id/reviews và /reviews/:id

app.use(notFound);
app.use(errorHandler);
