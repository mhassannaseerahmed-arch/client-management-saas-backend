import express from "express";
import mongoose from "mongoose";
import { seedDevUsers } from "../services/seedService.js";

export function dbConnectionMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  void (async () => {
    const currentUri = process.env.MONGO_URI;

    if (mongoose.connection.readyState !== 1) {
      if (!currentUri) {
        console.error("DEBUG: MONGO_URI is missing in process.env");
        return res.status(500).json({
          error: "missing_mongo_uri",
          hint: "Check Vercel Environment Variables",
        });
      }

      try {
        await mongoose.connect(currentUri, { serverSelectionTimeoutMS: 5000 });

        // Auto-seed in serverless environments
        if (process.env.VERCEL) {
          try {
            await seedDevUsers();
          } catch (e) {
            console.error(
              "DEBUG: Auto-seeding failed (likely already seeded):",
              e,
            );
          }
        }
      } catch (err) {
        console.error("DEBUG: MongoDB connection failed:", err);
        return res.status(500).json({
          error: "database_connection_failed",
          details: String(err),
        });
      }
    }

    next();
  })();
}
