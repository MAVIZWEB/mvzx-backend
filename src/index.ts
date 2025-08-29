 import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { apiLimiter } from "./middlewares/rateLimiter";
import { errorHandler } from "./middlewares/errorHandler";

import authRoutes from "./routes/authRoutes";
import purchaseRoutes from "./routes/purchaseRoutes";
import matrixRoutes from "./routes/matrixRoutes";
import withdrawalRoutes from "./routes/withdrawalRoutes";
import stakeRoutes from "./routes/stakeRoutes";

dotenv.config();

const app = express();
app.use(helmet());
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(apiLimiter);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/purchase", purchaseRoutes);
app.use("/matrix", matrixRoutes);
app.use("/withdrawal", withdrawalRoutes);
app.use("/stake", stakeRoutes);

app.use(errorHandler);

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`MVZx backend listening on ${port}`));
