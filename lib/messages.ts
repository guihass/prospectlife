import type { Lead } from "./types";

/**
 * Mensagens de abertura humanizadas — curtas, calmas, sem "vender" na primeira frase.
 * O objetivo é só abrir a conversa e receber um "oi" de volta.
 * Cada envio escolhe uma variação aleatória para não parecer robô.
 */

export interface MessageContext {
  lead: Lead;
  senderName: string;   // "Guilherme"
  senderBusiness?: string; // "Life Web" (opcional)
}

function firstName(name: string): string {
  // Nome da empresa "curto": corta sufixos e pega até 3 palavras
  const cleaned = name
    .replace(/\b(ltda|me|mei|eireli|epp|s\/a|sa)\b\.?/gi, "")
    .replace(/[-–|].*$/, "")
    .trim();
  return cleaned.split(/\s+/).slice(0, 3).join(" ");
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Mensagens para quem NÃO tem site (ou só tem Instagram). */
const NO_SITE_TEMPLATES: ((c: MessageContext, n: string, g: string) => string)[] = [
  (c, n, g) => `${g}! Tudo bem? 😊 Aqui é ${c.senderName}. Vi a ${n} no Google e achei o trabalho de vocês bem bacana. Posso te fazer uma pergunta rápida?`,
  (c, n, g) => `Oi, ${g.toLowerCase()}! Sou ${c.senderName}. Encontrei a ${n} enquanto pesquisava ${c.lead.niche.toLowerCase()} em ${c.lead.city} — vocês atendem por aqui mesmo?`,
  (c, n, g) => `${g}, tudo certo? Aqui é ${c.senderName}. Passei pelo perfil da ${n} e fiquei curioso sobre uma coisa, posso perguntar?`,
  (c, n, g) => `Oi! ${g}. Meu nome é ${c.senderName}. Estava olhando empresas de ${c.lead.niche.toLowerCase()} em ${c.lead.city} e a ${n} me chamou atenção. Quem cuida das redes/contato por aí?`,
  (c, n, g) => `${g}! Aqui é ${c.senderName}, tudo bem? Achei a ${n} no Google e vi que vocês ainda não têm site. Vocês recebem muito contato pelo WhatsApp mesmo?`,
  (c, n, g) => `Oi, ${g.toLowerCase()}! ${c.senderName} aqui. Vi a ${n} e queria só entender uma coisa rapidinho: hoje os clientes chegam até vocês mais pelo Instagram ou pelo Google?`,
];

/** Mensagens para quem TEM site (usa a auditoria como gancho, de leve). */
const WITH_SITE_TEMPLATES: ((c: MessageContext, n: string, g: string, hook: string) => string)[] = [
  (c, n, g, hook) => `${g}! Tudo bem? Aqui é ${c.senderName}. Entrei no site da ${n} hoje e reparei uma coisa: ${hook} Posso te mostrar?`,
  (c, n, g, hook) => `Oi, ${g.toLowerCase()}! Sou ${c.senderName}. Dei uma olhada no site da ${n} pelo celular e notei que ${hook} Quem cuida do site por aí?`,
  (c, n, g, hook) => `${g}, tudo certo? ${c.senderName} aqui. Vi o site da ${n} e percebi que ${hook} Quer que eu te mande um print?`,
];

function hookFromAudit(lead: Lead): string {
  const a = lead.audit;
  if (!a || !a.issues.length) return "ele pode estar perdendo alguns clientes no celular.";
  const top = a.issues[0];
  // Transforma o "pitch" em algo curto e sem julgamento
  const p = top.pitch.replace(/^O site de vocês /i, "o site ").replace(/^O site /i, "o site ");
  const short = p.split(/[—–\-]/)[0].trim();
  return short.endsWith(".") ? short : short + ".";
}

export function buildOpeningMessage(ctx: MessageContext): string {
  const n = firstName(ctx.lead.name);
  const g = greeting();
  if (ctx.lead.siteType === "site") {
    return pick(WITH_SITE_TEMPLATES)(ctx, n, g, hookFromAudit(ctx.lead));
  }
  return pick(NO_SITE_TEMPLATES)(ctx, n, g);
}

/** Segunda mensagem (caso a pessoa responda) — ainda sem pressão. */
export function buildFollowUp(ctx: MessageContext): string {
  const n = firstName(ctx.lead.name);
  if (ctx.lead.siteType === "site") {
    return pick([
      `Legal! Então, eu trabalho com sites e presença online${ctx.senderBusiness ? ` na ${ctx.senderBusiness}` : ""}. Não quero te vender nada agora, só te mostrar 2 ou 3 coisas que dá pra melhorar no site da ${n} e que trazem mais contato pelo WhatsApp. Se fizer sentido, a gente conversa. Pode ser?`,
      `Boa! É que eu ajudo empresas locais a arrumar esses detalhes no site. Se quiser, te mando uma lista rápida do que eu vi na ${n}, sem compromisso nenhum. Topa?`,
    ]);
  }
  return pick([
    `Legal! Então, eu ajudo negócios locais a aparecer melhor no Google${ctx.senderBusiness ? ` (sou da ${ctx.senderBusiness})` : ""}. Vi que a ${n} ainda não tem site e pensei que talvez vocês estejam perdendo cliente que pesquisa "${ctx.lead.niche.toLowerCase()} em ${ctx.lead.city}". Posso te explicar em 2 minutos como funciona?`,
    `Boa! É que eu monto sites simples pra empresas como a ${n} — coisa leve, que aparece no Google e manda o cliente direto pro WhatsApp. Se tiver interesse te mostro um exemplo, sem compromisso. Pode ser?`,
  ]);
}

export function whatsappLinkWithText(whatsapp: string | null, text: string): string | null {
  if (!whatsapp) return null;
  return `${whatsapp}?text=${encodeURIComponent(text)}`;
}
