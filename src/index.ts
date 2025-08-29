 import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes";
import purchaseRoutes from "./routes/purchaseRoutes";
import matrixRoutes from "./routes/matrixRoutes";
import withdrawalRoutes from "./routes/withdrawalRoutes";
import stakeRoutes from "./routes/stakeRoutes";

dotenv.config();
const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/purchase", purchaseRoutes);
app.use("/matrix", matrixRoutes);
app.use("/withdraw", withdrawalRoutes);
app.use("/stake", stakeRoutes);

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`Backend running on port ${port}`));
