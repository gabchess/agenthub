"use client";

import { useState } from "react";
import type { Story } from "@/lib/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProgressBar } from "@/components/ui/progress-bar";

export function StoryProgress({ stories }: { stories: Story[] }) {
  const [expanded, setExpanded] = useState(false);
  const completed = stories.filter((s) => s.status === "done").length;

  if (stories.length === 0) return null;

  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-gray-300">Stories</h3>
          <span className="text-[11px] text-gray-500 font-mono">
            {completed}/{stories.length}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <ProgressBar value={completed} max={stories.length} className="mt-3" />

      {expanded && (
        <div className="mt-3 space-y-2">
          {stories.map((story) => (
            <div
              key={story.id}
              className="flex items-start justify-between py-2 border-t border-border/50"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 text-[10px] font-mono">
                    #{story.story_index}
                  </span>
                  <span className="text-gray-300 text-xs truncate">
                    {story.title}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                  {story.description}
                </p>
              </div>
              <StatusBadge status={story.status} variant="story" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
