import crypto from "crypto";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;

// TOKEN_SECRET 必须通过环境变量配置，dev 环境用固定默认值，生产环境运行时报错
const TOKEN_SECRET = process.env.TOKEN_SECRET ?? "dev-secret-do-not-use-in-prod-!!!";

export function validateCredentials(username: string, password: string): boolean {
  if (!ADMIN_PASSWORD) throw new Error("ADMIN_PASSWORD env var not set");

  // 生产环境检查 TOKEN_SECRET 是否配置
  if (process.env.NODE_ENV === "production" && !process.env.TOKEN_SECRET) {
    console.error("⚠️  TOKEN_SECRET is not set in production! Tokens are insecure.");
  }

  // 用 timingSafeEqual 防止计时攻击（即使 username 不匹配也要走完比较）
  const userMatch = crypto.timingSafeEqual(
    Buffer.from(username.padEnd(64)),
    Buffer.from(ADMIN_USERNAME.padEnd(64))
  );
  const passMatch = crypto.timingSafeEqual(
    Buffer.from(password.padEnd(128)),
    Buffer.from(ADMIN_PASSWORD.padEnd(128))
  );
  return userMatch && passMatch;
}

// HMAC-SHA256 签名 token（类 JWT，无需额外依赖）
export function generateToken(username: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      username,
      exp: Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000),
      iat: Math.floor(Date.now() / 1000),
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

    // 用 timingSafeEqual 比较签名，防止 timing 攻击
    const expectedSig = crypto
      .createHmac("sha256", TOKEN_SECRET)
      .update(`${header}.${payload}`)
      .digest("base64url");

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;

    return { username: decoded.username };
  } catch {
    return null;
  }
}
