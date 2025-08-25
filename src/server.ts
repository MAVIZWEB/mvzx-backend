import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import games from "./routes/games";
import auth from "./routes/auth"; // 🔹 new

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/games", games);
app.use("/auth", auth); // 🔹 signup endpoints

app.get("/", (_req, res) => {
  res.send("MVZx backend is running 🚀");
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
