import type { Lead } from "./types";

/**
 * Funil de vendas: etapas com textos escritos pelo próprio usuário.
 * Os textos aceitam variáveis entre chaves que são trocadas pelos dados do lead.
 */
export interface FunnelStage {
  id: string;
  name: string;
  text: string;
}

export const PLACEHOLDERS: { key: string; desc: string }[] = [
  { key: "{empresa}", desc: "nome da empresa (curto)" },
  { key: "{empresa_completa}", desc: "nome completo como está no Google" },
  { key: "{cidade}", desc: "cidade do lead" },
  { key: "{nicho}", desc: "nicho pesquisado" },
  { key: "{meu_nome}", desc: "seu nome" },
  { key: "{minha_empresa}", desc: "sua empresa" },
  { key: "{saudacao}", desc: "Bom dia / Boa tarde / Boa noite (automático)" },
  { key: "{problema_site}", desc: "principal problema achado na auditoria (se tiver site)" },
  { key: "{nota_site}", desc: "nota do site de 0 a 100 (se tiver site)" },
];

export const DEFAULT_FUNNEL: FunnelStage[] = [
  {
    id: "abertura",
    name: "1. Abertura",
    text: "{saudacao}! Tudo bem? 😊 Aqui é {meu_nome}. Vi a {empresa} no Google e achei o trabalho de vocês bem bacana. Posso te fazer uma pergunta rápida?",
  },
  {
    id: "conexao",
    name: "2. Conexão",
    text: "Legal! É que eu ajudo negócios de {nicho} em {cidade} a aparecer melhor no Google. Hoje os clientes chegam até vocês mais pelo Instagram, por indicação ou pelo Google?",
  },
  {
    id: "apresentacao",
    name: "3. Apresentação",
    text: "Entendi. Vi que a {empresa} ainda não tem site — e muita gente pesquisa \"{nicho} em {cidade}\" no Google. O que eu faço é um site simples e rápido que aparece nessa busca e manda o cliente direto pro seu WhatsApp. Posso te mostrar um exemplo?",
  },
  {
    id: "proposta",
    name: "4. Proposta",
    text: "Pra {empresa} eu faria assim: página inicial com fotos, serviços, botão de WhatsApp e localização, já otimizada pro Google. Fica em R$ ____ e em uns 7 dias está no ar. Faz sentido pra vocês?",
  },
  {
    id: "followup",
    name: "5. Follow-up",
    text: "Oi! Passando só pra saber se ficou alguma dúvida sobre o site da {empresa}. Sem pressa nenhuma 🙂",
  },
];

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function shortName(name: string): string {
  const cleaned = name
    .replace(/\b(ltda|me|mei|eireli|epp|s\/a|sa)\b\.?/gi, "")
    .replace(/[-–|].*$/, "")
    .trim();
  return cleaned.split(/\s+/).slice(0, 3).join(" ");
}

export function renderTemplate(
  text: string,
  lead: Lead,
  me: { name: string; business: string }
): string {
  const topIssue = lead.audit?.issues?.[0];
  const problema = topIssue ? topIssue.pitch.split(/[—–]/)[0].trim().replace(/\.$/, "") : "o site pode estar perdendo clientes no celular";
  const map: Record<string, string> = {
    "{empresa}": shortName(lead.name),
    "{empresa_completa}": lead.name,
    "{cidade}": lead.city,
    "{nicho}": lead.niche.toLowerCase(),
    "{meu_nome}": me.name || "",
    "{minha_empresa}": me.business || "",
    "{saudacao}": greeting(),
    "{problema_site}": problema,
    "{nota_site}": lead.audit ? String(lead.audit.score) : "",
  };
  let out = text;
  for (const [k, v] of Object.entries(map)) out = out.split(k).join(v);
  return out.replace(/[ \t]{2,}/g, " ").trim();
}
