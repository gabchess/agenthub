import { NextRequest, NextResponse } from "next/server";
import { queryAll } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const runId = searchParams.get("run_id");
    const stepId = searchParams.get("step_id");
    const agentId = searchParams.get("agent_id");
    const traceType = searchParams.get("trace_type");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    let sql = "SELECT * FROM execution_traces WHERE 1=1";
    const params: (string | number)[] = [];

    if (runId) {
      sql += " AND run_id = ?";
      params.push(runId);
    }
    if (stepId) {
      sql += " AND step_id = ?";
      params.push(stepId);
    }
    if (agentId) {
      sql += " AND agent_id = ?";
      params.push(agentId);
    }
    if (traceType) {
      sql += " AND trace_type = ?";
      params.push(traceType);
    }

    sql += " ORDER BY timestamp DESC";
    sql += ` LIMIT ${limit ? parseInt(limit, 10) : 200}`;

    if (offset) {
      sql += ` OFFSET ${parseInt(offset, 10)}`;
    }

    const rows = await queryAll(sql, params);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Failed to query traces:", error);
    return NextResponse.json([], { status: 200 });
  }
}
