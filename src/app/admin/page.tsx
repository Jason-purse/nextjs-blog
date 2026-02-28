"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Post {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  readingTime: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/posts")
      .then((r) => {
        if (r.status === 401) { router.push("/admin/login"); return null; }
        return r.json();
      })
      .then((data) => { if (data) setPosts(data); })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleDelete(slug: string) {
    if (!confirm("Delete this post?")) return;
    const res = await fetch("/api/admin/posts?slug=" + slug, { method: "DELETE" });
    if (res.ok) setPosts(posts.filter((p) => p.slug !== slug));
  }

  if (loading) return <div style={{ padding: 40, color: "var(--foreground)", background: "var(--background)", minHeight: "100vh" }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)", padding: "32px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 28 }}>Admin Dashboard</h1>
          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/admin/settings" style={{ padding: "8px 16px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 14, color: "var(--foreground)", textDecoration: "none" }}>Settings</Link>
            <Link href="/" style={{ padding: "8px 16px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 14, color: "var(--foreground)", textDecoration: "none" }}>View Site</Link>
            <Link href="/admin/new" style={{ padding: "8px 16px", background: "var(--primary)", color: "var(--primary-foreground)", borderRadius: 4, fontSize: 14, textDecoration: "none" }}>New Post</Link>
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
              <th style={{ padding: "12px 8px", fontSize: 14 }}>Title</th>
              <th style={{ padding: "12px 8px", fontSize: 14 }}>Date</th>
              <th style={{ padding: "12px 8px", fontSize: 14 }}>Tags</th>
              <th style={{ padding: "12px 8px", fontSize: 14, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.slug} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "12px 8px" }}>{post.title}</td>
                <td style={{ padding: "12px 8px", fontSize: 14, color: "var(--muted-foreground)" }}>{post.date}</td>
                <td style={{ padding: "12px 8px", fontSize: 12 }}>{post.tags.join(", ")}</td>
                <td style={{ padding: "12px 8px", textAlign: "right" }}>
                  <Link href={"/admin/edit/" + post.slug} style={{ marginRight: 12, color: "var(--primary)", fontSize: 14, textDecoration: "none" }}>Edit</Link>
                  <button onClick={() => handleDelete(post.slug)} style={{ color: "#e74c3c", background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {posts.length === 0 && <p style={{ textAlign: "center", padding: 40, color: "var(--muted-foreground)" }}>No posts yet</p>}
      </div>
    </div>
  );
}
