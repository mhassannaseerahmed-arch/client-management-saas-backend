import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { UserModel, RefreshSessionModel } from "../models/index.js";
import {
  issueAccessToken,
  setAccessTokenCookie,
  clearAccessTokenCookie,
  setRefreshCookie,
  clearRefreshCookie,
  createRefreshSession,
  revokeSession,
  revokeAllUserSessions,
  findValidSessionByToken,
} from "../services/tokenService.js";
import { requireAccessToken } from "../middleware/auth.js";
import { REFRESH_TOKEN_COOKIE_NAME } from "../config/index.js";
import { nowMs } from "../utils/index.js";
import type { UserRecord, UserRole } from "../types/index.js";

const router = Router();

// POST /auth/register
router.post("/register", async (req, res) => {
  const { email, username, password, role } = (req.body ?? {}) as {
    email?: string;
    username?: string;
    password?: string;
    role?: UserRole;
  };

  if (!email || !username || !password) {
    return res.status(400).json({ error: "missing_fields" });
  }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ error: "invalid_email_format" });
  }
  
  if (username.trim().length < 3) {
    return res.status(400).json({ error: "username_too_short" });
  }

  // ✅ Password strength check
  if (password.length < 8) {
    return res.status(400).json({ error: "password_too_short" });
  }
  const normalizedEmail = email.trim().toLowerCase();
  const existing = (await UserModel.findOne({ email: normalizedEmail })
    .lean()
    .exec()) as UserRecord | null;

  if (existing) return res.status(409).json({ error: "email_already_exists" });

  const safeRole: UserRole = role ?? "employee";
  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 12);
  const user: UserRecord = {
    id,
    email: normalizedEmail,
    username: username.trim(),
    role: safeRole,
    passwordHash,
  };

  await UserModel.create(user);

  // Auto-login after register — set both cookies
  const accessToken = issueAccessToken(user);
  setAccessTokenCookie(res, accessToken);

  const { refreshToken } = await createRefreshSession(user.id);
  setRefreshCookie(res, refreshToken);

  return res.status(201).json({ success: true });
});

// POST /auth/login
router.post("/login", async (req, res) => {
  const { email, password } = (req.body ?? {}) as {
    email?: string;
    password?: string;
  };

  if (!email || !password)
    return res.status(400).json({ error: "missing_credentials" });

  const user = (await UserModel.findOne({
    email: email.trim().toLowerCase(),
  })
    .lean()
    .exec()) as UserRecord | null;

  if (!user) return res.status(401).json({ error: "invalid_credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "invalid_credentials" });

  const { refreshToken } = await createRefreshSession(user.id);
  setRefreshCookie(res, refreshToken);

  const accessToken = issueAccessToken(user);
  setAccessTokenCookie(res, accessToken);

  return res.json({ success: true });
});

// POST /auth/refresh
router.post("/refresh", async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] as
    | string
    | undefined;

  if (!refreshToken)
    return res.status(401).json({ error: "missing_refresh_token" });

  const found = await findValidSessionByToken(refreshToken);
  if (!found.session)
    return res.status(401).json({ error: "invalid_refresh_token" });

  if (found.status !== "ok") {
    if (found.status === "revoked") {
      await revokeAllUserSessions(found.session.userId);
    }
    clearRefreshCookie(res);
    clearAccessTokenCookie(res);
    return res.status(401).json({ error: `refresh_${found.status}` });
  }

  await RefreshSessionModel.updateOne(
    { id: found.session.id },
    { $set: { lastUsedAtMs: nowMs() } },
  ).exec();

  const user = (await UserModel.findOne({ id: found.session.userId })
    .lean()
    .exec()) as UserRecord | null;

  if (!user) {
    clearRefreshCookie(res);
    clearAccessTokenCookie(res);
    return res.status(401).json({ error: "unknown_user" });
  }

  const { session: newSession, refreshToken: newRefreshToken } =
    await createRefreshSession(user.id);
  await revokeSession(found.session, newSession.id);
  setRefreshCookie(res, newRefreshToken);

  const accessToken = issueAccessToken(user);
  setAccessTokenCookie(res, accessToken);

  return res.json({ success: true });
});

// POST /auth/logout
router.post("/logout", async (req, res) => {
  const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] as
    | string
    | undefined;

  if (refreshToken) {
    const found = await findValidSessionByToken(refreshToken);
    if (found.session) await revokeSession(found.session);
  }

  clearRefreshCookie(res);
  clearAccessTokenCookie(res);
  return res.json({ ok: true });
});

// PUT /auth/password
router.put("/password", requireAccessToken, async (req, res) => {
  const user = (req as unknown as { user: UserRecord }).user;
  const { currentPassword, newPassword } = (req.body ?? {}) as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: "missing_fields" });

  if (newPassword.length < 8)
    return res.status(400).json({ error: "password_too_short" });

  const dbUser = (await UserModel.findOne({ id: user.id })
    .lean()
    .exec()) as UserRecord | null;

  if (!dbUser) return res.status(404).json({ error: "user_not_found" });

  const ok = await bcrypt.compare(currentPassword, dbUser.passwordHash);
  if (!ok) return res.status(401).json({ error: "wrong_current_password" });

  const newHash = await bcrypt.hash(newPassword, 12);
  await UserModel.updateOne({ id: user.id }, { $set: { passwordHash: newHash } }).exec();

  return res.json({ success: true });
});

// GET /auth/me
router.get("/me", requireAccessToken, (req, res) => {
  const user = (req as unknown as { user: UserRecord }).user;
  return res.json({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  });
});

export default router;
