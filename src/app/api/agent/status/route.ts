import { getOllamaStatus } from "@/lib/agent/ollama";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getOllamaStatus();
  return NextResponse.json({ success: true, ...status });
}

