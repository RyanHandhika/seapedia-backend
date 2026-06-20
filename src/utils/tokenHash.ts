import crypto from "crypto";

// Refresh tokens are already high-entropy signed JWTs, so a fast SHA-256
// digest (not bcrypt) is sufficient for exact-match lookup in the DB —
// we are hashing to avoid storing the raw bearer token at rest, not to
// defend against brute-force guessing the way a password hash must.
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
