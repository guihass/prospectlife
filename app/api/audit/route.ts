import { NextResponse } from "next/server";
import { auditSite } from "@/lib/audit";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const { url } = (await req.json().catch(() => ({}))) as { url?: string };
  if (!url) return NextResponse.json({ error: "url obrigatória" }, { status: 400 });
  try {
    const audit = await auditSite(url);
    return NextResponse.json({ audit });
  } catch (e) {
    return NextResponse.json({ audit: null, error: e instanceof Error ? e.message : "erro" });
  }
}
