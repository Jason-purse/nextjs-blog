"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Settings {
  title: string;
  supportedLanguages: string[];
  defaultLanguage: string;
  githubContentRepo: string;
  translationEnabled: boolean;
}

const AVAILABLE_LANGUAGES = [
  { code: "zh", label: "Chinese (中文)" },
  { code: "en", label: "English" },
  { code: "ja", label: "Japanese (日本語)" },
];

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState<Settings>({
    title: "Zen Blog",
    supportedLanguages: ["zh", "en"],
    defaultLanguage: "zh",
    githubContentRepo: "",
    translationEnabled: false,
  });

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => {
        if (r.status === 401) {
          router.push("/admin/login");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) setSettings(data);
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) {
      setMessage("Settings saved successfully!");
      setMessage(""), setTimeout(() => 3000);
    } else {
      setMessage("Failed to save settings");
    }
  }

  function handleLanguageToggle(code: string) {
    const langs = settings.supportedLanguages.includes(code)
      ? settings.supportedLanguages.filter((l) => l !== code)
      : [...settings.supportedLanguages, code];
    setSettings({ ...settings, supportedLanguages: langs });
  }

  function handleDefaultLanguageChange(code: string) {
    if (settings.supportedLanguages.includes(code)) {
      setSettings({ ...settings, defaultLanguage: code });
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 40, color: "var(--foreground)", background: "var(--background)", minHeight: "100vh" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)", padding: "32px 24px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 28 }}>Settings</h1>
          <Link href="/admin" style={{ padding: "8px 16px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 14, color: "var(--foreground)", textDecoration: "none" }}>
            Back to Dashboard
          </Link>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Blog Title */}
          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 500 }}>Blog Title</label>
            <input
              type="text"
              value={settings.title}
              onChange={(e) => setSettings({ ...settings, title: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", fontSize: 16, border: "1px solid var(--border)", borderRadius: 4, background: "var(--background)", color: "var(--foreground)" }}
            />
          </div>

          {/* Supported Languages */}
          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 500 }}>Supported Languages</label>
            <div style={{ display: "flex", gap: 16 }}>
              {AVAILABLE_LANGUAGES.map((lang) => (
                <label key={lang.code} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={settings.supportedLanguages.includes(lang.code)}
                    onChange={() => handleLanguageToggle(lang.code)}
                    style={{ width: 16, height: 16 }}
                  />
                  {lang.label}
                </label>
              ))}
            </div>
          </div>

          {/* Default Language */}
          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 500 }}>Default Language</label>
            <select
              value={settings.defaultLanguage}
              onChange={(e) => handleDefaultLanguageChange(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", fontSize: 16, border: "1px solid var(--border)", borderRadius: 4, background: "var(--background)", color: "var(--foreground)" }}
            >
              {settings.supportedLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {AVAILABLE_LANGUAGES.find((l) => l.code === lang)?.label || lang}
                </option>
              ))}
            </select>
          </div>

          {/* GitHub Content Repo */}
          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 500 }}>GitHub Content Repo</label>
            <input
              type="text"
              placeholder="e.g., user/blog-content"
              value={settings.githubContentRepo}
              onChange={(e) => setSettings({ ...settings, githubContentRepo: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", fontSize: 16, border: "1px solid var(--border)", borderRadius: 4, background: "var(--background)", color: "var(--foreground)" }}
            />
            <p style={{ marginTop: 6, fontSize: 12, color: "var(--muted-foreground)" }}>
              Set GITHUB_CONTENT_REPO env var to enable GitHub storage
            </p>
          </div>

          {/* Translation Enabled */}
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={settings.translationEnabled}
                onChange={(e) => setSettings({ ...settings, translationEnabled: e.target.checked })}
                style={{ width: 18, height: 18 }}
              />
              Enable Translation
            </label>
          </div>

          {/* Save Button */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: "12px 24px", background: "var(--primary)", color: "var(--primary-foreground)", border: "none", borderRadius: 4, fontSize: 16, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
            {message && (
              <span style={{ fontSize: 14, color: message.includes("success") ? "#22c55e" : "#ef4444" }}>
                {message}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
