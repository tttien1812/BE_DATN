import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import db from "./src/models/index.js";
import initApiRoutes from "./src/routes/web.js";
import { serverAdapter } from "./src/config/bullBoard.js";

const app = express();

// CORS
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static folder
app.use("/uploads", express.static("uploads"));
app.use("/admin/queues", serverAdapter.getRouter());

// Routes
initApiRoutes(app);

// Test route
app.get("/", (req, res) => {
  res.send("Hello NodeJS + Express + Sequelize 👋");
});

// Start server
const PORT = 3000;
app.listen(PORT, async () => {
  try {
    await db.sequelize.authenticate();
    console.log(`Server chạy tại http://localhost:${PORT}`);
  } catch (err) {
    console.error("❌ DB error:", err);
  }
});
