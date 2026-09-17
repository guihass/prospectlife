import { NextResponse } from "next/server";
import { verifyNumbers, type VerifyConfig } from "@/lib/verify";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Verifica se números têm WhatsApp usando o provedor configurado pelo usuário
 * (Evolution API ou Z-API). As credenciais vêm no corpo e não são guardadas.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { config?: VerifyConfig; numbers?: string[] };
  if (!body.config || !Array.isArray(body.numbers)) {
    return NextResponse.json({ results: [], error: "config e numbers são obrigatórios" }, { status: 400 });
  }
  const { results, error } = await verifyNumbers(body.config, body.numbers.slice(0, 100));
  return NextResponse.json({ results, error: error ?? null }, { status: error && !results.length ? 502 : 200 });
}
