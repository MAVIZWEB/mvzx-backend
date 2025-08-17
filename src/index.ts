import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import simulateRouter from "./routes/simulate.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/simulate", simulateRouter);

const PORT = Number(process.env.PORT || 10000);
app.listen(PORT, () => {
  console.log(`MVZx backend simulation API running on :${PORT}`);
});
