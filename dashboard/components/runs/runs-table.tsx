"use client";

import { useState } from "react";
import Link from "next/link";
import type { Run } from "@/lib/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { relativeTime, truncateText } from "@/lib/utils";
import { clsx } from "clsx";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-gray-500 hover:text-accent-cyan transition-colors p-0.5"
      title="Copy to clipboard"
    >
      {copied ? (
        <svg className="w-3 h-3 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

export function RunsTable({ runs }: { runs: Run[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-gray-500 text-[11px] uppercase tracking-wider">
            <th className="text-left py-3 px-4 font-medium">Run ID</th>
            <th className="text-left py-3 px-4 font-medium">Workflow</th>
            <th className="text-left py-3 px-4 font-medium">Task</th>
            <th className="text-left py-3 px-4 font-medium">Status</th>
            <th className="text-left py-3 px-4 font-medium">Progress</th>
            <th className="text-left py-3 px-4 font-medium">Trace</th>
            <th className="text-left py-3 px-4 font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => {
            const completedSteps = run.steps?.filter(
              (s) => s.status === "done"
            ).length ?? 0;
            const totalSteps = run.steps?.length ?? 0;

            return (
              <tr
                key={run.id}
                className="border-b border-border/50 hover:bg-raised/50 transition-colors group"
              >
                <td className="py-3 px-4">
                  <Link
                    href={`/runs/${run.id}`}
                    className="text-accent-green hover:text-glow-green font-mono text-xs transition-all"
                  >
                    {run.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="py-3 px-4 text-gray-400 font-mono text-xs">
                  {run.workflow_id}
                </td>
                <td className="py-3 px-4 text-gray-300 text-xs max-w-[200px]">
                  <span className="truncate block">
                    {truncateText(run.task, 60)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={run.status} variant="run" />
                </td>
                <td className="py-3 px-4 w-32">
                  <ProgressBar value={completedSteps} max={totalSteps} />
                </td>
                <td className="py-3 px-4">
                  {run.trace_hash ? (
                    <div className="flex items-center gap-1.5">
                      <span
                        className={clsx(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          run.trace_tx_hash
                            ? "bg-accent-green"
                            : "bg-accent-amber"
                        )}
                        title={run.trace_tx_hash ? "On-chain" : "Hash only"}
                      />
                      <code className="text-[10px] font-mono text-gray-500 truncate max-w-[80px]">
                        {run.trace_hash.slice(0, 10)}
                      </code>
                      <CopyButton text={run.trace_hash} />
                      {run.trace_tx_hash && (
                        <a
                          href={`https://explorer.testnet.monad.xyz/tx/${run.trace_tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent-green hover:text-accent-green/80 transition-colors"
                          title="View on Monad Explorer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-600 text-[10px]">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">
                  {relativeTime(run.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
