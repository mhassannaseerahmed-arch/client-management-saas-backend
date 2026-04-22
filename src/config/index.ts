import "dotenv/config";

export const PORT = Number(process.env.PORT ?? 4000);
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";

export const ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET ?? "dev_access_secret_change_me";

export const REFRESH_TOKEN_COOKIE_NAME = "refresh_token";
export const ACCESS_TOKEN_COOKIE_NAME = "token";

export const REFRESH_TOKEN_TTL_DAYS = Number(
  process.env.REFRESH_TOKEN_TTL_DAYS ?? 14,
);
export const ACCESS_TOKEN_TTL_MINUTES = Number(
  process.env.ACCESS_TOKEN_TTL_MINUTES ?? 10,
);

export const MONGO_URI = process.env.MONGO_URI ?? "";
export const isProd = process.env.NODE_ENV === "production";
