// Simple admin auth - hardcoded for now, can be moved to env vars
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "zen2024";

export function validateCredentials(username: string, password: string): boolean {
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
