 import express from "express";
import cors from "cors";
import auth from "./routes/auth";
import payments from "./routes/payments";
import matrix from "./routes/matrix";
import wallet from "./routes/wallet";
import game from "./routes/game";
import pub from "./routes/public";

const app = express();
app.use(cors({ origin: process.env.FRONT_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.use("/auth", auth);
app.use("/payments", payments);
app.use("/matrix", matrix);
app.use("/wallet", wallet);
app.use("/game", game);
app.use("/public", pub);

app.get("/", (_req, res)=>res.send("mvzx-backend ok"));
app.listen(process.env.PORT || 8080, ()=>console.log("API up"));
