"use client";

import { useState, useEffect } from "react";

interface ViewCountProps {
  slug: string;
}

export function ViewCount({ slug }: ViewCountProps) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    // Increment view count
    fetch(`/api/views?slug=${slug}`, { method: "POST" })
      .then((res) => res.json())
      .then((data) => setCount(data.count))
      .catch(() => setCount(0));

    // Get current view count
    fetch(`/api/views?slug=${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (count === null) {
          setCount(data.count);
        }
      })
      .catch(() => {});
  }, [slug]);

  if (count === null) {
    return <span className="text-muted-foreground">0 views</span>;
  }

  return (
    <span className="flex items-center gap-1">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      {count} {count === 1 ? "view" : "views"}
    </span>
  );
}
