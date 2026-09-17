import Anthropic from "@anthropic-ai/sdk";
import type { Lead } from "./types";

/**
 * IA opcional: se o usuário informar uma chave da Anthropic, o Claude escreve
 * uma mensagem de abertura única para cada empresa. Sem chave, o app usa os
 * modelos humanizados de lib/messages.ts (que já funcionam muito bem).
 */
export async function aiOpeningMessage(opts: {
  apiKey: string;
  lead: Lead;
  senderName: string;
  senderBusiness?: string;
  tone?: string;
}): Promise<string> {
  const client = new Anthropic({ apiKey: opts.apiKey });
  const { lead } = opts;

  const auditSummary =
    lead.siteType === "site" && lead.audit
      ? `Site: ${lead.website}. Nota do site: ${lead.audit.score}/100. Experiência mobile: ${lead.audit.mobile.verdict}. Principais problemas: ${lead.audit.issues
          .slice(0, 3)
          .map((i) => i.title)
          .join("; ") || "nenhum"}.`
      : lead.siteType === "social"
        ? "A empresa não tem site, só rede social (Instagram/Facebook)."
        : "A empresa não tem site nenhum.";

  const system = `Você escreve a PRIMEIRA mensagem de WhatsApp de ${opts.senderName}${opts.senderBusiness ? ` (da ${opts.senderBusiness})` : ""}, que ajuda empresas locais com site e presença online.

Regras absolutas:
- Máximo de 2 frases curtas (até 45 palavras no total). É uma abertura de conversa, NÃO um pitch.
- Tom: calmo, humano, gentil, como uma pessoa real mandando mensagem pra um vizinho comerciante. ${opts.tone ?? ""}
- Comece com uma saudação natural e diga quem é.
- Mencione algo específico e verdadeiro da empresa (nome, ramo, cidade, ou um detalhe do site se houver).
- Termine com UMA pergunta simples e fácil de responder (sim/não ou "quem cuida disso").
- Não use palavras como "proposta", "orçamento", "oportunidade", "solução", "imperdível", "promoção".
- Nada de listas, negrito, links ou mais de um emoji.
- Escreva no idioma do país da empresa (padrão: português do Brasil).
- Responda SOMENTE com o texto da mensagem, sem aspas nem explicações.`;

  const user = `Empresa: ${lead.name}
Ramo: ${lead.niche}
Cidade: ${lead.city}
${auditSummary}`;

  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 300,
    output_config: { effort: "low" },
    system,
    messages: [{ role: "user", content: user }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  if (!text) throw new Error("A IA não retornou texto.");
  return text.replace(/^["“”']+|["“”']+$/g, "");
}
