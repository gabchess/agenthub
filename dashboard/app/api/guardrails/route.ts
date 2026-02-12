import { NextResponse } from "next/server";
import { queryAll } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await queryAll("SELECT * FROM agent_guardrails ORDER BY agent_id");
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Failed to query guardrails:", error);
    return NextResponse.json([], { status: 200 });
  }
}
