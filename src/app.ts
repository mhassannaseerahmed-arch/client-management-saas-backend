/// <reference path="../global.d.ts" />

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

import { CLIENT_ORIGIN, isProd } from "./config/index.js";
import { dbConnectionMiddleware } from "./middleware/db.js";
import { UserModel } from "./models/index.js";

import authRouter from "./routes/auth.js";
import clientsRouter from "./routes/clients.js";
import employeesRouter from "./routes/employees.js";
import projectsRouter from "./routes/projects.js";
import tasksRouter from "./routes/tasks.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ── Core middleware ───────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: isProd ? true : CLIENT_ORIGIN,
    credentials: true,
  }),
);

// ── DB connection (serverless-safe) ───────────────────────────
app.use(dbConnectionMiddleware);

// ── Routes ────────────────────────────────────────────────────
app.use("/auth", authRouter);
app.use("/api/clients", clientsRouter);
app.use("/api/employees", employeesRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/tasks", tasksRouter);

// ── Health checks ─────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/api/health", async (_req, res) => {
  let userCount = -1;
  try {
    userCount = await UserModel.countDocuments();
  } catch {
    /* ignore */
  }
  return res.json({
    ok: true,
    db:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    user_count: userCount,
    has_uri: !!process.env.MONGO_URI,
  });
});

// ── Static frontend (non-serverless production) ───────────────
if (isProd && !process.env.VERCEL) {
  const buildPath = path.join(process.cwd(), "../client/build");
  app.use(express.static(buildPath));

  app.get("(.*)", (req, res) => {
    if (!req.url.startsWith("/api/")) {
      res.sendFile(path.join(buildPath, "index.html"));
    }
  });
}

export default app;
