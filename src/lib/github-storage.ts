// GitHub API client for reading/writing files in a GitHub repo
// Uses native fetch (no extra libraries)

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_CONTENT_REPO = process.env.GITHUB_CONTENT_REPO;
const GITHUB_CONTENT_BRANCH = process.env.GITHUB_CONTENT_BRANCH || "main";

const BASE_URL = GITHUB_CONTENT_REPO
  ? `https://api.github.com/repos/${GITHUB_CONTENT_REPO}/contents`
  : null;

const headers: HeadersInit = {
  Accept: "application/vnd.github.v3+json",
  ...(GITHUB_TOKEN && { Authorization: `Bearer ${GITHUB_TOKEN}` }),
};

/**
 * Get file content + sha from GitHub
 * @param path - File path relative to repo root (e.g., "content/posts/foo.mdx")
 * @returns Object with content and sha, or null if not found
 */
export async function githubRead(
  path: string
): Promise<{ content: string; sha: string } | null> {
  if (!BASE_URL || !GITHUB_TOKEN) {
    throw new Error("GitHub storage not configured");
  }

  const url = `${BASE_URL}/${path}?ref=${GITHUB_CONTENT_BRANCH}`;
  // next: { revalidate } 让 Next.js 缓存响应，相同 URL 在 TTL 内只调用一次 GitHub API
  // 插件资源（plugin.json / CSS / JS）用长缓存；settings.json 等配置用短缓存
  const isPluginAsset = path.startsWith('installed-plugins/')
  const revalidate = isPluginAsset ? 86400 : 30  // 插件资源 24h，配置文件 30s
  const response = await fetch(url, { headers, next: { revalidate } });

  if (response.status === 404) {
    return null;
  }

  // 速率限制（403/429）：不 throw，优雅降级返回 null
  if (response.status === 403 || response.status === 429) {
    const resetAt = response.headers.get('x-ratelimit-reset')
    console.warn(`[GitHub] Rate limit exceeded. Resets at: ${resetAt ? new Date(Number(resetAt)*1000).toISOString() : 'unknown'}`)
    return null;
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = Buffer.from(data.content, "base64").toString("utf-8");

  return {
    content,
    sha: data.sha,
  };
}

/**
 * Create or update file on GitHub
 * @param path - File path relative to repo root
 * @param content - File content to write
 * @param sha - SHA of existing file (required for update, undefined for create)
 * @param message - Commit message (default: "Update {path}" or "Create {path}")
 */
export async function githubWrite(
  path: string,
  content: string,
  sha?: string,
  message?: string
): Promise<void> {
  if (!BASE_URL || !GITHUB_TOKEN) {
    throw new Error("GitHub storage not configured");
  }

  const url = `${BASE_URL}/${path}`;
  const commitMessage = message || (sha ? `Update ${path}` : `Create ${path}`);

  const body = {
    message: commitMessage,
    content: Buffer.from(content).toString("base64"),
    branch: GITHUB_CONTENT_BRANCH,
    ...(sha && { sha }),
  };

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }
}

/**
 * Delete file on GitHub
 * @param path - File path relative to repo root
 * @param sha - SHA of the file to delete
 * @param message - Commit message (default: "Delete {path}")
 */
export async function githubDelete(
  path: string,
  sha: string,
  message?: string
): Promise<void> {
  if (!BASE_URL || !GITHUB_TOKEN) {
    throw new Error("GitHub storage not configured");
  }

  const url = `${BASE_URL}/${path}?ref=${GITHUB_CONTENT_BRANCH}`;
  const commitMessage = message || `Delete ${path}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: commitMessage,
      branch: GITHUB_CONTENT_BRANCH,
      sha,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }
}

/**
 * List files in a directory
 * @param dirPath - Directory path relative to repo root (e.g., "content/posts")
 * @returns Array of file objects with name, path, and sha
 */
export async function githubList(
  dirPath: string
): Promise<Array<{ name: string; path: string; sha: string }>> {
  if (!BASE_URL || !GITHUB_TOKEN) {
    throw new Error("GitHub storage not configured");
  }

  const url = `${BASE_URL}/${dirPath}?ref=${GITHUB_CONTENT_BRANCH}`;
  const response = await fetch(url, { headers });

  if (response.status === 404) {
    return [];
  }

  if (response.status === 403 || response.status === 429) {
    const resetAt = response.headers.get('x-ratelimit-reset')
    console.warn(`[GitHub] Rate limit exceeded. Resets at: ${resetAt ? new Date(Number(resetAt)*1000).toISOString() : 'unknown'}`)
    return [];
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  // Directory listing returns an array
  if (Array.isArray(data)) {
    return data.map((item: { name: string; path: string; sha: string }) => ({
      name: item.name,
      path: item.path,
      sha: item.sha,
    }));
  }

  return [];
}
