import mongoose from "mongoose";
import app from "./app.js";
import { PORT, MONGO_URI } from "./config/index.js";
import { seedDevUsers } from "./services/seedService.js";

async function main() {
  if (!MONGO_URI) {
    throw new Error(
      "Missing MONGO_URI. Create server/.env from server/.env.example",
    );
  }

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  await seedDevUsers();

  app.listen(PORT, () => {
    console.log(`Auth API listening on http://localhost:${PORT}`);
    console.log(`CORS origin: ${process.env.CLIENT_ORIGIN ?? "http://localhost:3000"}`);
  });
}

// Only start the server when running locally (not in serverless)
if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  void main();
}

export default app;
