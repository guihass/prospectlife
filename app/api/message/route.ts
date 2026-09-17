import { NextResponse } from "next/server";
import type { Lead } from "@/lib/types";
import { buildOpeningMessage, buildFollowUp } from "@/lib/messages";
import { aiOpeningMessage } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Gera a mensagem de abertura (curta e humana) para um lead.
 * Se vier anthropicKey, usa o Claude para escrever uma mensagem única;
 * senão, usa os modelos humanizados internos (grátis).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    lead?: Lead;
    senderName?: string;
    senderBusiness?: string;
    anthropicKey?: string;
    tone?: string;
  };
  if (!body.lead) return NextResponse.json({ error: "lead obrigatório" }, { status: 400 });

  const ctx = {
    lead: body.lead,
    senderName: (body.senderName || "").trim() || "eu",
    senderBusiness: (body.senderBusiness || "").trim() || undefined,
  };

  const followUp = buildFollowUp(ctx);
  const anthropicKey = (body.anthropicKey || process.env.ANTHROPIC_API_KEY || "").trim();

  if (anthropicKey) {
    try {
      const text = await aiOpeningMessage({ apiKey: anthropicKey, ...ctx, tone: body.tone });
      return NextResponse.json({ text, followUp, source: "ia" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "erro";
      // Cai para o modelo interno, mas avisa
      return NextResponse.json({ text: buildOpeningMessage(ctx), followUp, source: "modelo", warning: `IA indisponível (${msg}). Usei o modelo interno.` });
    }
  }

  return NextResponse.json({ text: buildOpeningMessage(ctx), followUp, source: "modelo" });
}
