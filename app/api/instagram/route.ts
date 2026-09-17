import { NextResponse } from "next/server";
import { findInstagram } from "@/lib/instagram";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const { name, city } = (await req.json().catch(() => ({}))) as { name?: string; city?: string };
  if (!name) return NextResponse.json({ error: "name obrigatório" }, { status: 400 });
  try {
    const result = await findInstagram(name, city || "");
    return NextResponse.json({ result });
  } catch (e) {
    return NextResponse.json({ result: null, error: e instanceof Error ? e.message : "erro" });
  }
}
