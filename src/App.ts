import express from "express";
import bodyParser from "body-parser";
import authRoutes from "./routes/authRoutes";
import purchaseRoutes from "./routes/purchaseRoutes";
import matrixRoutes from "./routes/matrixRoutes";
import walletRoutes from "./routes/walletRoutes";

const app = express();
app.use(bodyParser.json());

app.use("/auth", authRoutes);
app.use("/purchase", purchaseRoutes);
app.use("/matrix", matrixRoutes);
app.use("/wallet", walletRoutes);

app.listen(4000, () => console.log("Server running on http://localhost:4000"));
