import express from "express";
import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_SECRET, ACCESS_TOKEN_COOKIE_NAME } from "../config/index.js";
import { UserModel } from "../models/index.js";
import type { UserRecord } from "../types/index.js";

/**
 * Reads the access token from the HttpOnly cookie (not from Authorization header).
 * Attaches the resolved user to req.user on success.
 */
export function requireAccessToken(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const token = req.cookies?.[ACCESS_TOKEN_COOKIE_NAME] as string | undefined;

  if (!token) {
    return res.status(401).json({ error: "missing_access_token" });
  }

  try {
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET) as { sub: string };

    void (async () => {
      const user = (await UserModel.findOne({ id: payload.sub })
        .lean()
        .exec()) as UserRecord | null;

      if (!user) return res.status(401).json({ error: "unknown_user" });

      (req as unknown as { user: UserRecord }).user = user;
      next();
    })();
  } catch {
    return res.status(401).json({ error: "invalid_access_token" });
  }
}
