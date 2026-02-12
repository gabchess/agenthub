import { NextResponse } from "next/server";
import { queryAll } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const traces = await queryAll(
      `SELECT * FROM execution_traces
       WHERE trace_type = 'wallet.tx'
       ORDER BY timestamp DESC
       LIMIT 50`
    );

    return NextResponse.json({ traces });
  } catch (error) {
    console.error("Failed to query wallet data:", error);
    return NextResponse.json({ traces: [] }, { status: 200 });
  }
}
