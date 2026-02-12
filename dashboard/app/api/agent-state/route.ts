import { NextRequest, NextResponse } from "next/server";
import { queryAll } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const runId = request.nextUrl.searchParams.get("run_id");
    const agentId = request.nextUrl.searchParams.get("agent_id");

    let sql = "SELECT * FROM agent_state WHERE 1=1";
    const params: string[] = [];

    if (runId) {
      sql += " AND run_id = ?";
      params.push(runId);
    }
    if (agentId) {
      sql += " AND agent_id = ?";
      params.push(agentId);
    }

    sql += " ORDER BY updated_at DESC LIMIT 100";

    const rows = await queryAll(sql, params);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Failed to query agent state:", error);
    return NextResponse.json([], { status: 200 });
  }
}
