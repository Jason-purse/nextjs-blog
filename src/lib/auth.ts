import crypto from "crypto";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;
const TOKEN_SECRET = process.env.TOKEN_SECRET || crypto.randomBytes(32).toString("hex");

export function validateCredentials(username: string, password: string): boolean {
  if (!ADMIN_PASSWORD) throw new Error("ADMIN_PASSWORD env var not set");
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

// HMAC-SHA256 signed token
export function generateToken(username: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      username,
      exp: Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000),
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}

export function validateToken(token: string): { username: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", TOKEN_SECRET)
      .update(`${header}.${payload}`)
      .digest("base64url");

    if (signature !== expectedSignature) return null;

    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;

    return { username: decoded.username };
  } catch {
    return null;
  }
}