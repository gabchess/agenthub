"use client";

import { useParams } from "next/navigation";
import { useRun } from "@/lib/hooks/use-run";
import { RunDetail } from "@/components/runs/run-detail";
import { CardSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";

export default function RunDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { run, isLoading, error } = useRun(id);

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/runs" className="hover:text-gray-300 transition-colors">
          Runs
        </Link>
        <span>/</span>
        <span className="text-accent-green font-mono">{id.slice(0, 8)}</span>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error || !run ? (
        <EmptyState message="Run not found" />
      ) : (
        <RunDetail run={run} />
      )}
    </div>
  );
}
