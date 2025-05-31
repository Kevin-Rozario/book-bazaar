import express from "express";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.route.js";
import bookRoutes from "./routes/books.route.js";
import reviewRoutes from "./routes/reviews.route.js";
import paymentRoutes from "./routes/payments.route.js";
import orderRoutes from "./routes/orders.route.js";
import cartRoutes from "./routes/carts.route.js";
import addressRoutes from "./routes/addresses.route.js";

const app = express();

// middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/books", bookRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("api/v1/carts", cartRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/addresses", addressRoutes);
export default app;
