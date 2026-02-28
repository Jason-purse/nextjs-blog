"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        router.push("/admin");
      } else {
        setError("Invalid credentials");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)", color: "var(--foreground)" }}>
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 400, padding: 32, border: "1px solid var(--border)", borderRadius: 8 }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 24, marginBottom: 24 }}>Admin Login</h1>
        {error && <p style={{ color: "#e74c3c", marginBottom: 16, fontSize: 14 }}>{error}</p>}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 14, marginBottom: 4, color: "var(--muted-foreground)" }}>Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} style={{ width: "100%", padding: "8px 12px", background: "var(--secondary)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--foreground)", outline: "none" }} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 14, marginBottom: 4, color: "var(--muted-foreground)" }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", padding: "8px 12px", background: "var(--secondary)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--foreground)", outline: "none" }} />
        </div>
        <button type="submit" disabled={loading} style={{ width: "100%", padding: "10px 16px", background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: 4, cursor: loading ? "wait" : "pointer", fontWeight: 500 }}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
