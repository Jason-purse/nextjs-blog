const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;

export function validateCredentials(username: string, password: string): boolean {
  if (!ADMIN_PASSWORD) throw new Error("ADMIN_PASSWORD env var not set");
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

// Simple token-based auth using base64 (for demo purposes)
export function generateToken(username: string): string {
  const payload = JSON.stringify({ username, exp: Date.now() + 24 * 60 * 60 * 1000 });
  return Buffer.from(payload).toString("base64");
}

export function validateToken(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64").toString());
    return payload.username === ADMIN_USERNAME && payload.exp > Date.now();
  } catch {
    return false;
  }
}
