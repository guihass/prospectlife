import { NextResponse } from "next/server";
import { sendWhatsApp, type SenderConfig } from "@/lib/sender";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Envia UMA mensagem de WhatsApp pelo provedor configurado pelo usuário.
 * As credenciais vêm no corpo da requisição (ficam salvas só no navegador
 * do usuário) — o servidor não guarda nada.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    config?: SenderConfig;
    to?: string;
    text?: string;
    templateParams?: string[];
  };
  if (!body.config || !body.to || !body.text) {
    return NextResponse.json({ ok: false, error: "config, to e text são obrigatórios" }, { status: 400 });
  }
  const result = await sendWhatsApp(body.config, body.to, body.text, body.templateParams);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
