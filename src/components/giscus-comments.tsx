"use client";

import Giscus from "@giscus/react";

interface GiscusCommentsProps {
  identifier?: string;
}

export function GiscusComments({ identifier }: GiscusCommentsProps) {
  return (
    <div className="mt-16 border-t border-border pt-8">
      <h2 className="font-heading text-2xl font-semibold mb-6">
        Comments
      </h2>
      <Giscus
        repo="Jason-purse/nextjs-blog"
        repoId="R_kgDORbLmXQ"
        category="Announcements"
        categoryId="DIC_kwDORbLmXc4C3aJl"
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
