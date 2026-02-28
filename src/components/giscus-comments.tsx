"use client";

import Giscus from "@giscus/react";

interface GiscusCommentsProps {
  identifier?: string;
}

export function GiscusComments({ identifier }: GiscusCommentsProps) {
  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO || "Jason-purse/nextjs-blog";
  const repoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID || "";
  const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID || "";

  return (
    <div className="mt-16 border-t border-border pt-8">
      <h2 className="font-heading text-2xl font-semibold mb-6">Comments</h2>
      <Giscus
        repo={repo as `${string}/${string}`}
        repoId={repoId}
        category="Announcements"
        categoryId={categoryId}
        mapping="pathname"
        strict="0"
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="top"
        theme="preferred_color_scheme"
        lang="zh-CN"
        loading="lazy"
        {...(identifier && { identifier })}
      />
    </div>
  );
}
