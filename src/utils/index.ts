import crypto from "crypto";

export function sha256Base64Url(input: string): string {
  return crypto
    .createHash("sha256")
    .update(input)
    .digest("base64url");
}

export function nowMs(): number {
  return Date.now();
}
