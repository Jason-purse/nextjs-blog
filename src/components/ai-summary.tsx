"use client";

import { useState } from "react";

interface AISummaryProps {
  summary: string;
}

export function AISummary({ summary }: AISummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!summary) return null;

  return (
    <div className="ai-summary">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between"
        aria-expanded={isExpanded}
      >
        <div className="ai-summary-header">
          <span className="text-lg">✨</span>
          <span>AI Summary</span>
        </div>
        <svg
          className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isExpanded ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <p className="ai-summary-content mt-2">{summary}</p>
      </div>
    </div>
  );
}
