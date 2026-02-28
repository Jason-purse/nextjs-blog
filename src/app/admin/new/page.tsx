"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewPost() {
  const router = useRouter();
  const [form, setForm] = useState({ slug: "", title: "", description: "", tags: "", content: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update(field: string, value: string) { setForm({ ...form, [field]: value }); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) }),
    });
    if (res.ok) router.push("/admin");
    else { const d = await res.json(); setError(d.error || "Failed"); }
    setSaving(false);
  }

  const inputStyle = { width: "100%", padding: "8px 12px", background: "var(--secondary)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--foreground)", outline: "none", marginTop: 4 };

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)", padding: "32px 24px" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 24 }}>New Post</h1>
          <Link href="/admin" style={{ fontSize: 14, color: "var(--muted-foreground)", textDecoration: "none" }}>← Back</Link>
        </div>
        {error && <p style={{ color: "#e74c3c", marginBottom: 16, fontSize: 14 }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}><label style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Slug</label><input value={form.slug} onChange={(e) => update("slug", e.target.value)} placeholder="my-post-slug" style={inputStyle} required /></div>
          <div style={{ marginBottom: 16 }}><label style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Title</label><input value={form.title} onChange={(e) => update("title", e.target.value)} style={inputStyle} required /></div>
          <div style={{ marginBottom: 16 }}><label style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Description</label><input value={form.description} onChange={(e) => update("description", e.target.value)} style={inputStyle} /></div>
          <div style={{ marginBottom: 16 }}><label style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Tags (comma separated)</label><input value={form.tags} onChange={(e) => update("tags", e.target.value)} placeholder="tech, coding" style={inputStyle} /></div>
          <div style={{ marginBottom: 24 }}><label style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Content (Markdown)</label><textarea value={form.content} onChange={(e) => update("content", e.target.value)} rows={15} style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace" }} required /></div>
          <button type="submit" disabled={saving} style={{ padding: "10px 24px", background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 500 }}>{saving ? "Saving..." : "Create Post"}</button>
        </form>
      </div>
    </div>
  );
}
