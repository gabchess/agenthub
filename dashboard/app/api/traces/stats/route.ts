import { NextRequest, NextResponse } from "next/server";
import { queryAll } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const runId = request.nextUrl.searchParams.get("run_id");

    let sql = `
      SELECT
        run_id,
        COUNT(*) as total_traces,
        COALESCE(SUM(input_tokens), 0) as total_input_tokens,
        COALESCE(SUM(output_tokens), 0) as total_output_tokens,
        COALESCE(SUM(duration_ms), 0) as total_duration_ms
      FROM execution_traces
    `;
    const params: string[] = [];

    if (runId) {
      sql += " WHERE run_id = ?";
      params.push(runId);
    }

    sql += " GROUP BY run_id";

    const rows = await queryAll(sql, params);

    // Get trace type counts
    let typeSql = `
      SELECT run_id, trace_type, COUNT(*) as count
      FROM execution_traces
    `;
    const typeParams: string[] = [];

    if (runId) {
      typeSql += " WHERE run_id = ?";
      typeParams.push(runId);
    }

    typeSql += " GROUP BY run_id, trace_type";

    const typeCounts = await queryAll(typeSql, typeParams);

    const typeCountsByRun: Record<string, Record<string, number>> = {};
    for (const row of typeCounts) {
      const rid = row.run_id as string;
      if (!typeCountsByRun[rid]) typeCountsByRun[rid] = {};
      typeCountsByRun[rid][row.trace_type as string] = row.count as number;
    }

    const result = rows.map((row) => ({
      ...row,
      trace_type_counts: typeCountsByRun[row.run_id as string] ?? {},
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to get trace stats:", error);
    return NextResponse.json([], { status: 200 });
  }
}
