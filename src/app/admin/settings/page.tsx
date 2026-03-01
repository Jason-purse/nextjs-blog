"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Settings {
  title: string;
  supportedLanguages: string[];
  defaultLanguage: string;
  translationEnabled: boolean;
  translationApi: string;
}

const AVAILABLE_LANGUAGES = [
  { code: "zh", label: "Chinese (中文)" },
  { code: "en", label: "English" },
  { code: "ja", label: "Japanese (日本語)" },
  { code: "ko", label: "Korean (한국어)" },
];

const TRANSLATION_APIS = [
  { value: "minimax", label: "MiniMax" },
  { value: "openai", label: "OpenAI" },
  { value: "deepl", label: "DeepL" },
];

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState<Settings>({
    title: "AI Blog",
    supportedLanguages: ["zh", "en"],
    defaultLanguage: "zh",
    translationEnabled: false,
    translationApi: "minimax",
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
      setTimeout(() => setMessage(""), 3000);
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

          {/* GitHub Storage Info */}
          <div style={{ padding: 16, background: "var(--muted)", borderRadius: 6, border: "1px solid var(--border)" }}>
            <p style={{ margin: 0, fontSize: 14, color: "var(--foreground)", lineHeight: 1.6 }}>
              GitHub storage is configured via environment variables (<code style={{ background: "var(--background)", padding: "2px 6px", borderRadius: 3, fontSize: 12 }}>GITHUB_TOKEN</code>, <code style={{ background: "var(--background)", padding: "2px 6px", borderRadius: 3, fontSize: 12 }}>GITHUB_CONTENT_REPO</code>) in your Vercel dashboard. These are not editable here for security reasons.
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

          {/* Translation API */}
          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 500 }}>Translation API</label>
            <select
              value={settings.translationApi}
              onChange={(e) => setSettings({ ...settings, translationApi: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", fontSize: 16, border: "1px solid var(--border)", borderRadius: 4, background: "var(--background)", color: "var(--foreground)" }}
            >
              {TRANSLATION_APIS.map((api) => (
                <option key={api.value} value={api.value}>
                  {api.label}
                </option>
              ))}
            </select>
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
