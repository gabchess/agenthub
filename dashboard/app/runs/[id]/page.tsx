"use client";

import { useParams } from "next/navigation";
import { useRun } from "@/lib/hooks/use-run";
import { RunDetail } from "@/components/runs/run-detail";
import { CardSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import Link from "next/link";

export default function RunDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { run, isLoading, error } = useRun(id);

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/" className="hover:text-gray-300 transition-colors">
          Home
        </Link>
        <span className="text-gray-700">/</span>
        <Link href="/runs" className="hover:text-gray-300 transition-colors">
          Runs
        </Link>
        <span className="text-gray-700">/</span>
        <span className="text-accent-green font-mono">{id.slice(0, 8)}</span>
      </nav>

      <ErrorBoundary>
        {isLoading ? (
          <div className="space-y-4">
            <CardSkeleton />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          </div>
        ) : error ? (
          <div className="bg-surface border border-accent-red/30 rounded-lg p-6 text-center">
            <div className="text-accent-red text-xl mb-2">&#9888;</div>
            <p className="text-sm text-gray-300 mb-1">Failed to load run</p>
            <p className="text-xs text-gray-500 font-mono">{error.message || "Network error"}</p>
          </div>
        ) : !run ? (
          <EmptyState message={`Run ${id.slice(0, 8)} not found`} />
        ) : (
          <RunDetail run={run} />
        )}
      </ErrorBoundary>
    </div>
  );
}
