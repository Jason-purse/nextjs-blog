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

interface Plugin {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  installed: boolean;
  installedAt?: number;
}

interface PluginsData {
  plugins: Plugin[];
  activeTheme: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [pluginsData, setPluginsData] = useState<PluginsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [revalidateLoading, setRevalidateLoading] = useState(false);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Fetch posts
        const postsRes = await fetch("/api/admin/posts");
        if (postsRes.status === 401) {
          router.push("/admin/login");
          return;
        }
        const postsData = await postsRes.json();
        if (postsData) setPosts(postsData);

        // Fetch plugins
        const pluginsRes = await fetch("/api/admin/plugins");
        if (pluginsRes.status === 401) {
          router.push("/admin/login"); // Redirect if plugins API also returns 401
          return;
        }
        const pluginsJson = await pluginsRes.json();
        setPluginsData(pluginsJson);
      } catch (error) {
        console.error("Failed to fetch admin data:", error);
        // Optionally handle errors, e.g., show a message to the user
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [router]);

  async function handleDelete(slug: string) {
    if (!confirm("Delete this post?")) return;
    const res = await fetch("/api/admin/posts?slug=" + slug, { method: "DELETE" });
    if (res.ok) setPosts(posts.filter((p) => p.slug !== slug));
  }

  async function handleRevalidate() {
    setRevalidateLoading(true);
    try {
      const res = await fetch("/api/admin/revalidate", { method: "POST" });
      if (res.ok) {
        alert("页面重建成功！");
      } else {
        alert("页面重建失败：" + (await res.text()));
      }
    } catch (error) {
      alert("页面重建时发生错误！");
      console.error("Revalidate failed:", error);
    } finally {
      setRevalidateLoading(false);
    }
  }

  const installedPluginsCount = pluginsData?.plugins.filter(p => p.installed).length || 0;
  const enabledPluginsCount = pluginsData?.plugins.filter(p => p.enabled).length || 0;

  const recentlyInstalledPlugins = pluginsData?.plugins
    .filter(p => p.installed && p.installedAt)
    .sort((a, b) => (b.installedAt ?? 0) - (a.installedAt ?? 0))
    .slice(0, 3) || [];

  if (loading) return <div style={{ padding: 40, color: "var(--foreground)", background: "var(--background)", minHeight: "100vh" }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)", padding: "32px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 28 }}>Admin Dashboard</h1>
          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/admin/plugins" style={{ padding: "8px 16px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 14, color: "var(--foreground)", textDecoration: "none" }}>插件</Link>
            <Link href="/admin/settings" style={{ padding: "8px 16px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 14, color: "var(--foreground)", textDecoration: "none" }}>Settings</Link>
            <Link href="/" style={{ padding: "8px 16px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 14, color: "var(--foreground)", textDecoration: "none" }}>View Site</Link>
            <Link href="/admin/new" style={{ padding: "8px 16px", background: "var(--primary)", color: "var(--primary-foreground)", borderRadius: 4, fontSize: 14, textDecoration: "none" }}>New Post</Link>
          </div>
        </div>

        {/* Plugin Status Quick Overview Area */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 24,
          marginBottom: 48,
        }}>
          {/* Plugin Status Card */}
          <div style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: 180,
          }}>
            <h2 style={{ fontSize: 20, marginBottom: 16, color: "var(--foreground)" }}>插件状态 🔌</h2>
            <p style={{ fontSize: 16, color: "var(--muted-foreground)", marginBottom: 24 }}>
              已安装 {installedPluginsCount} 个 / 已启用 {enabledPluginsCount} 个
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: "auto" }}>
              <Link href="/admin/plugins?tab=market" style={{
                padding: "8px 16px",
                border: "1px solid var(--border)",
                borderRadius: 4,
                fontSize: 14,
                color: "var(--foreground)",
                textDecoration: "none",
                flexGrow: 1,
                textAlign: "center"
              }}>
                前往插件市场
              </Link>
              <Link href="/admin/plugins" style={{
                padding: "8px 16px",
                background: "var(--secondary)",
                color: "var(--foreground)",
                borderRadius: 4,
                fontSize: 14,
                textDecoration: "none",
                flexGrow: 1,
                textAlign: "center"
              }}>
                管理已安装
              </Link>
            </div>
          </div>

          {/* Recently Installed Card */}
          <div style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: 180,
          }}>
            <h2 style={{ fontSize: 20, marginBottom: 16, color: "var(--foreground)" }}>最近安装</h2>
            {recentlyInstalledPlugins.length > 0 ? (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, marginBottom: 24 }}>
                {recentlyInstalledPlugins.map(plugin => (
                  <li key={plugin.id} style={{ display: "flex", alignItems: "center", marginBottom: 8, fontSize: 15, color: "var(--foreground)" }}>
                    <span style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: plugin.enabled ? "var(--primary)" : "var(--muted-foreground)",
                      marginRight: 8,
                    }}></span>
                    {plugin.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: "var(--muted-foreground)" }}>暂无最近安装插件</p>
            )}
             <div style={{ marginTop: "auto" }}>
              <button
                onClick={handleRevalidate}
                disabled={revalidateLoading}
                style={{
                  padding: "8px 16px",
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                  borderRadius: 4,
                  fontSize: 14,
                  border: "none",
                  cursor: revalidateLoading ? "not-allowed" : "pointer",
                  opacity: revalidateLoading ? 0.7 : 1,
                  width: "100%",
                }}
              >
                {revalidateLoading ? "重建中..." : "立刻重建页面"}
              </button>
            </div>
          </div>

        </div>

        {/* Original Post List */}
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
