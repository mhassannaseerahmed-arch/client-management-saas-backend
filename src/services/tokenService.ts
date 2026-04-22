import crypto from "crypto";
import jwt from "jsonwebtoken";
import express from "express";
import {
  ACCESS_TOKEN_SECRET,
  ACCESS_TOKEN_TTL_MINUTES,
  REFRESH_TOKEN_COOKIE_NAME,
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_TTL_DAYS,
  isProd,
} from "../config/index.js";
import { RefreshSessionModel } from "../models/index.js";
import { sha256Base64Url, nowMs } from "../utils/index.js";
import type { UserRecord, RefreshSession } from "../types/index.js";

// ── Access token ──────────────────────────────────────────────
export function issueAccessToken(user: UserRecord): string {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      username: user.username,
      email: user.email,
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: `${ACCESS_TOKEN_TTL_MINUTES}m` },
  );
}

/**
 * Sets the JWT access token as an HttpOnly cookie.
 * The client never touches this value directly.
 */
export function setAccessTokenCookie(
  res: express.Response,
  accessToken: string,
): void {
  res.cookie(ACCESS_TOKEN_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_TTL_MINUTES * 60 * 1000,
  });
}

export function clearAccessTokenCookie(res: express.Response): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, { path: "/" });
}

// ── Refresh token ─────────────────────────────────────────────
export function setRefreshCookie(
  res: express.Response,
  refreshToken: string,
): void {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/auth",
    maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res: express.Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, { path: "/auth" });
}

// ── Session management ────────────────────────────────────────
export async function createRefreshSession(userId: string) {
  const sessionId = crypto.randomUUID();
  const refreshToken = crypto.randomBytes(48).toString("base64url");
  const refreshTokenHash = sha256Base64Url(refreshToken);
  const session: RefreshSession = {
    id: sessionId,
    userId,
    refreshTokenHash,
    createdAtMs: nowMs(),
    expiresAtMs: nowMs() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
  await RefreshSessionModel.create(session);
  return { session, refreshToken };
}

export async function revokeSession(
  session: RefreshSession,
  replacedBySessionId?: string,
): Promise<void> {
  if (session.revokedAtMs) return;
  const update: Partial<RefreshSession> = { revokedAtMs: nowMs() };
  if (replacedBySessionId) update.replacedBySessionId = replacedBySessionId;
  await RefreshSessionModel.updateOne(
    { id: session.id },
    { $set: update },
  ).exec();
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await RefreshSessionModel.updateMany(
    { userId, revokedAtMs: { $exists: false } },
    { $set: { revokedAtMs: nowMs() } },
  ).exec();
}

export async function findValidSessionByToken(refreshToken: string) {
  const tokenHash = sha256Base64Url(refreshToken);
  const session = await RefreshSessionModel.findOne({
    refreshTokenHash: tokenHash,
  })
    .lean<RefreshSession>()
    .exec();

  if (!session) return { session: null, status: "missing" as const };
  if (session.revokedAtMs) return { session, status: "revoked" as const };
  if (session.expiresAtMs <= nowMs())
    return { session, status: "expired" as const };
  return { session, status: "ok" as const };
}
