"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function EditPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [form, setForm] = useState({ title: "", description: "", date: "", tags: "", content: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/posts?slug=" + slug)
      .then((r) => { if (r.status === 401) { router.push("/admin/login"); return null; } return r.json(); })
      .then((data) => {
        if (data && !data.error) {
          setForm({ title: data.title, description: data.description || "", date: data.date, tags: (data.tags || []).join(", "), content: data.content });
        }
      })
      .finally(() => setLoading(false));
  }, [slug, router]);

  function update(field: string, value: string) { setForm({ ...form, [field]: value }); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/posts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, ...form, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) }),
    });
    if (res.ok) router.push("/admin");
    else { const d = await res.json(); setError(d.error || "Failed"); }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this post permanently?")) return;
    const res = await fetch("/api/admin/posts?slug=" + slug, { method: "DELETE" });
    if (res.ok) router.push("/admin");
  }

  if (loading) return <div style={{ padding: 40, color: "var(--foreground)", background: "var(--background)", minHeight: "100vh" }}>Loading...</div>;

  const inputStyle = { width: "100%", padding: "8px 12px", background: "var(--secondary)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--foreground)", outline: "none", marginTop: 4 };

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)", padding: "32px 24px" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 24 }}>Edit: {form.title}</h1>
          <Link href="/admin" style={{ fontSize: 14, color: "var(--muted-foreground)", textDecoration: "none" }}>← Back</Link>
        </div>
        {error && <p style={{ color: "#e74c3c", marginBottom: 16, fontSize: 14 }}>{error}</p>}
        <form onSubmit={handleSave}>
          <div style={{ marginBottom: 16 }}><label style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Title</label><input value={form.title} onChange={(e) => update("title", e.target.value)} style={inputStyle} required /></div>
          <div style={{ marginBottom: 16 }}><label style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Description</label><input value={form.description} onChange={(e) => update("description", e.target.value)} style={inputStyle} /></div>
          <div style={{ marginBottom: 16 }}><label style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Date</label><input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} style={inputStyle} /></div>
          <div style={{ marginBottom: 16 }}><label style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Tags (comma separated)</label><input value={form.tags} onChange={(e) => update("tags", e.target.value)} style={inputStyle} /></div>
          <div style={{ marginBottom: 24 }}><label style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Content (Markdown)</label><textarea value={form.content} onChange={(e) => update("content", e.target.value)} rows={15} style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace" }} required /></div>
          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" disabled={saving} style={{ padding: "10px 24px", background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 500 }}>{saving ? "Saving..." : "Save Changes"}</button>
            <button type="button" onClick={handleDelete} style={{ padding: "10px 24px", background: "none", color: "#e74c3c", border: "1px solid #e74c3c", borderRadius: 4, cursor: "pointer" }}>Delete Post</button>
          </div>
        </form>
      </div>
    </div>
  );
}
