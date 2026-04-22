export type UserRole = "admin" | "manager" | "employee" | "client";

export type UserRecord = {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  passwordHash: string;
};

export type RefreshSession = {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAtMs: number;
  revokedAtMs?: number;
  replacedBySessionId?: string;
  createdAtMs: number;
  lastUsedAtMs?: number;
};
