// Storage abstraction layer - auto-switches between local fs and GitHub
// Uses local filesystem when GITHUB_TOKEN is not set, GitHub API otherwise

import fs from "fs";
import path from "path";
import { githubRead, githubWrite, githubDelete, githubList } from "./github-storage";

const isProduction = () => !!process.env.GITHUB_TOKEN;

// Get the base content directory
const getBaseDir = () => path.join(process.cwd(), "content");

export const storage = {
  /**
   * Read a file
   * @param filePath - File path relative to content directory (e.g., "posts/foo.mdx")
   * @returns File content as string, or null if not found
   */
  read: async (filePath: string): Promise<string | null> => {
    if (isProduction()) {
      const result = await githubRead(filePath);
      return result?.content ?? null;
    }

    // Local filesystem fallback
    const fullPath = path.join(getBaseDir(), filePath);
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    return fs.readFileSync(fullPath, "utf-8");
  },

  /**
   * Write a file (create or update)
   * @param filePath - File path relative to content directory
   * @param content - File content to write
   * @param commitMsg - Optional commit message (GitHub only)
   */
  write: async (filePath: string, content: string, commitMsg?: string): Promise<void> => {
    if (isProduction()) {
      // For update, we need to get the sha first
      const existing = await githubRead(filePath);
      await githubWrite(filePath, content, existing?.sha, commitMsg);
      return;
    }

    // Local filesystem fallback
    const fullPath = path.join(getBaseDir(), filePath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content, "utf-8");
  },

  /**
   * Delete a file
   * @param filePath - File path relative to content directory
   * @param commitMsg - Optional commit message (GitHub only)
   */
  delete: async (filePath: string, commitMsg?: string): Promise<void> => {
    if (isProduction()) {
      const existing = await githubRead(filePath);
      if (!existing) {
        throw new Error(`File not found: ${filePath}`);
      }
      await githubDelete(filePath, existing.sha, commitMsg);
      return;
    }

    // Local filesystem fallback
    const fullPath = path.join(getBaseDir(), filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    fs.unlinkSync(fullPath);
  },

  /**
   * List files in a directory
   * @param dirPath - Directory path relative to content directory (e.g., "posts")
   * @returns Array of filenames (not full paths)
   */
  list: async (dirPath: string): Promise<string[]> => {
    if (isProduction()) {
      const files = await githubList(dirPath);
      return files.map((f) => f.name);
    }

    // Local filesystem fallback
    const fullPath = path.join(getBaseDir(), dirPath);
    if (!fs.existsSync(fullPath)) {
      return [];
    }
    return fs.readdirSync(fullPath);
  },

  /**
   * Check if a file exists
   * @param filePath - File path relative to content directory
   */
  exists: async (filePath: string): Promise<boolean> => {
    if (isProduction()) {
      const result = await githubRead(filePath);
      return result !== null;
    }

    const fullPath = path.join(getBaseDir(), filePath);
    return fs.existsSync(fullPath);
  },
};
