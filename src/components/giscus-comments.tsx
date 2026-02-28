"use client";

import Giscus from "@giscus/react";

interface GiscusCommentsProps {
  identifier?: string;
}

export function GiscusComments({ identifier }: GiscusCommentsProps) {
  // TODO: Update repo, repoId, categoryId from https://giscus.app
  return (
    <div className="mt-16 border-t border-border pt-8">
      <h2 className="font-heading text-2xl font-semibold mb-6">
        Comments
      </h2>
      <Giscus
        // TODO: Replace with your actual repo in format "owner/repo"
        repo="jasonj/minimax-blog"
        // TODO: Replace with your actual repoId from giscus.app
        repoId="PLACEHOLDER_REPO_ID"
        // TODO: Replace with your actual category name
        category="Announcements"
        // TODO: Replace with your actual categoryId from giscus.app
        categoryId="PLACEHOLDER_CATEGORY_ID"
        mapping="pathname"
        strict="0"
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="top"
        theme="preferred_color_scheme"
        lang="en"
        loading="lazy"
        {...(identifier && { identifier })}
      />
    </div>
  );
}
