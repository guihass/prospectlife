import type { Lead } from "./types";

/**
 * Funil de vendas: etapas com textos escritos pelo próprio usuário.
 * Há um funil por idioma — o app usa o idioma do país do lead.
 * Os textos aceitam variáveis entre chaves que são trocadas pelos dados do lead.
 */
export interface FunnelStage {
  id: string;
  name: string;
  text: string;
}

export type Funnels = Record<string, FunnelStage[]>; // chave = idioma base ("pt", "es", "en"...)

export const PLACEHOLDERS: { key: string; desc: string }[] = [
  { key: "{empresa}", desc: "nome da empresa (curto)" },
  { key: "{empresa_completa}", desc: "nome completo como está no Google" },
  { key: "{cidade}", desc: "cidade do lead" },
  { key: "{nicho}", desc: "nicho pesquisado" },
  { key: "{meu_nome}", desc: "seu nome" },
  { key: "{minha_empresa}", desc: "sua empresa" },
  { key: "{saudacao}", desc: "Bom dia / Boa tarde / Boa noite, no idioma do país (automático)" },
  { key: "{problema_site}", desc: "principal problema achado na auditoria (se tiver site)" },
  { key: "{nota_site}", desc: "nota do site de 0 a 100 (se tiver site)" },
];

/** Idioma base a partir do código do país/idioma ("pt-BR" -> "pt"). */
export function baseLang(lang: string): string {
  return (lang || "en").split("-")[0].toLowerCase();
}

export const LANG_NAMES: Record<string, string> = {
  pt: "Português",
  es: "Espanhol",
  en: "Inglês",
  fr: "Francês",
  it: "Italiano",
  de: "Alemão",
};

const s = (id: string, name: string, text: string): FunnelStage => ({ id, name, text });

export const DEFAULT_FUNNELS: Funnels = {
  pt: [
    s("abertura", "1. Abertura", "{saudacao}! Tudo bem? 😊 Aqui é {meu_nome}. Vi a {empresa} no Google e achei o trabalho de vocês bem bacana. Posso te fazer uma pergunta rápida?"),
    s("conexao", "2. Conexão", "Legal! É que eu ajudo negócios de {nicho} em {cidade} a aparecer melhor no Google. Hoje os clientes chegam até vocês mais pelo Instagram, por indicação ou pelo Google?"),
    s("apresentacao", "3. Apresentação", "Entendi. Vi que a {empresa} ainda não tem site — e muita gente pesquisa \"{nicho} em {cidade}\" no Google. O que eu faço é um site simples e rápido que aparece nessa busca e manda o cliente direto pro seu WhatsApp. Posso te mostrar um exemplo?"),
    s("proposta", "4. Proposta", "Pra {empresa} eu faria assim: página inicial com fotos, serviços, botão de WhatsApp e localização, já otimizada pro Google. Fica em R$ ____ e em uns 7 dias está no ar. Faz sentido pra vocês?"),
    s("followup", "5. Follow-up", "Oi! Passando só pra saber se ficou alguma dúvida sobre o site da {empresa}. Sem pressa nenhuma 🙂"),
  ],
  es: [
    s("abertura", "1. Apertura", "¡{saudacao}! ¿Qué tal? 😊 Soy {meu_nome}. Vi {empresa} en Google y me gustó mucho lo que hacen. ¿Puedo hacerte una pregunta rápida?"),
    s("conexao", "2. Conexión", "¡Genial! Es que ayudo a negocios de {nicho} en {cidade} a aparecer mejor en Google. Hoy, ¿los clientes les llegan más por Instagram, por recomendación o por Google?"),
    s("apresentacao", "3. Presentación", "Entiendo. Vi que {empresa} todavía no tiene página web, y mucha gente busca \"{nicho} en {cidade}\" en Google. Lo que hago es una web sencilla y rápida que aparece en esa búsqueda y manda al cliente directo a su WhatsApp. ¿Te muestro un ejemplo?"),
    s("proposta", "4. Propuesta", "Para {empresa} lo haría así: página de inicio con fotos, servicios, botón de WhatsApp y ubicación, ya optimizada para Google. Cuesta ____ y en unos 7 días está en línea. ¿Les tiene sentido?"),
    s("followup", "5. Seguimiento", "¡Hola! Solo pasaba para saber si quedó alguna duda sobre la web de {empresa}. Sin ninguna prisa 🙂"),
  ],
  en: [
    s("abertura", "1. Opening", "{saudacao}! How's it going? 😊 This is {meu_nome}. I came across {empresa} on Google and really liked what you do. Mind if I ask you a quick question?"),
    s("conexao", "2. Connection", "Great! I help {nicho} businesses in {cidade} show up better on Google. These days, do most of your customers find you on Instagram, by referral, or on Google?"),
    s("apresentacao", "3. Presentation", "Got it. I noticed {empresa} doesn't have a website yet, and a lot of people search \"{nicho} in {cidade}\" on Google. What I do is a simple, fast website that shows up in that search and sends customers straight to your WhatsApp. Can I show you an example?"),
    s("proposta", "4. Proposal", "For {empresa} I'd do this: a home page with photos, services, a WhatsApp button and your location, already optimized for Google. It's ____ and it's live in about 7 days. Does that make sense for you?"),
    s("followup", "5. Follow-up", "Hi! Just checking in to see if you had any questions about the website for {empresa}. No rush at all 🙂"),
  ],
  fr: [
    s("abertura", "1. Ouverture", "{saudacao} ! Ça va ? 😊 C'est {meu_nome}. J'ai vu {empresa} sur Google et j'ai beaucoup aimé votre travail. Je peux vous poser une petite question ?"),
    s("conexao", "2. Connexion", "Super ! En fait, j'aide les entreprises de {nicho} à {cidade} à être mieux visibles sur Google. Aujourd'hui, vos clients vous trouvent plutôt par Instagram, par le bouche-à-oreille ou par Google ?"),
    s("apresentacao", "3. Présentation", "Je vois. J'ai remarqué que {empresa} n'a pas encore de site web, alors que beaucoup de gens cherchent « {nicho} à {cidade} » sur Google. Ce que je fais, c'est un site simple et rapide qui apparaît dans cette recherche et envoie le client directement sur votre WhatsApp. Je peux vous montrer un exemple ?"),
    s("proposta", "4. Proposition", "Pour {empresa}, je ferais ceci : une page d'accueil avec photos, services, bouton WhatsApp et localisation, déjà optimisée pour Google. C'est ____ et c'est en ligne en 7 jours environ. Ça vous parle ?"),
    s("followup", "5. Relance", "Bonjour ! Je passais juste voir si vous aviez des questions sur le site de {empresa}. Sans aucune pression 🙂"),
  ],
  it: [
    s("abertura", "1. Apertura", "{saudacao}! Tutto bene? 😊 Sono {meu_nome}. Ho visto {empresa} su Google e mi è piaciuto molto il vostro lavoro. Posso farvi una domanda veloce?"),
    s("conexao", "2. Connessione", "Ottimo! Aiuto le attività di {nicho} a {cidade} a farsi trovare meglio su Google. Oggi i clienti vi trovano più su Instagram, tramite passaparola o su Google?"),
    s("apresentacao", "3. Presentazione", "Capisco. Ho notato che {empresa} non ha ancora un sito, e tante persone cercano \"{nicho} a {cidade}\" su Google. Quello che faccio è un sito semplice e veloce che compare in quella ricerca e manda il cliente direttamente sul vostro WhatsApp. Vi mostro un esempio?"),
    s("proposta", "4. Proposta", "Per {empresa} farei così: home page con foto, servizi, pulsante WhatsApp e posizione, già ottimizzata per Google. Costa ____ ed è online in circa 7 giorni. Ha senso per voi?"),
    s("followup", "5. Follow-up", "Ciao! Passavo solo per sapere se avete dubbi sul sito di {empresa}. Nessuna fretta 🙂"),
  ],
  de: [
    s("abertura", "1. Eröffnung", "{saudacao}! Wie geht's? 😊 Hier ist {meu_nome}. Ich habe {empresa} bei Google gesehen und finde eure Arbeit richtig gut. Darf ich euch eine kurze Frage stellen?"),
    s("conexao", "2. Verbindung", "Super! Ich helfe {nicho}-Betrieben in {cidade}, bei Google besser gefunden zu werden. Finden euch die Kunden heute eher über Instagram, über Empfehlungen oder über Google?"),
    s("apresentacao", "3. Vorstellung", "Verstehe. Mir ist aufgefallen, dass {empresa} noch keine Website hat – und viele suchen bei Google nach „{nicho} in {cidade}“. Ich baue eine einfache, schnelle Website, die bei dieser Suche erscheint und den Kunden direkt zu eurem WhatsApp schickt. Soll ich euch ein Beispiel zeigen?"),
    s("proposta", "4. Angebot", "Für {empresa} würde ich das so machen: Startseite mit Fotos, Leistungen, WhatsApp-Button und Standort, schon für Google optimiert. Das kostet ____ und ist in etwa 7 Tagen online. Passt das für euch?"),
    s("followup", "5. Nachfassen", "Hallo! Ich wollte nur kurz fragen, ob noch Fragen zur Website für {empresa} offen sind. Kein Stress 🙂"),
  ],
};

/** Funil padrão para um idioma (cai para inglês se não houver tradução). */
export function defaultFunnelFor(lang: string): FunnelStage[] {
  return DEFAULT_FUNNELS[baseLang(lang)] ?? DEFAULT_FUNNELS.en;
}

/** Devolve o funil ativo para um idioma: o editado pelo usuário ou o padrão. */
export function funnelFor(funnels: Funnels, lang: string): FunnelStage[] {
  const key = baseLang(lang);
  const custom = funnels[key];
  return custom && custom.length ? custom : defaultFunnelFor(key);
}

const GREETINGS: Record<string, [string, string, string]> = {
  pt: ["Bom dia", "Boa tarde", "Boa noite"],
  es: ["Buenos días", "Buenas tardes", "Buenas noches"],
  en: ["Good morning", "Good afternoon", "Good evening"],
  fr: ["Bonjour", "Bonjour", "Bonsoir"],
  it: ["Buongiorno", "Buon pomeriggio", "Buonasera"],
  de: ["Guten Morgen", "Guten Tag", "Guten Abend"],
  nl: ["Goedemorgen", "Goedemiddag", "Goedenavond"],
  sv: ["God morgon", "God eftermiddag", "God kväll"],
  no: ["God morgen", "God ettermiddag", "God kveld"],
  da: ["Godmorgen", "God eftermiddag", "Godaften"],
  fi: ["Hyvää huomenta", "Hyvää päivää", "Hyvää iltaa"],
  pl: ["Dzień dobry", "Dzień dobry", "Dobry wieczór"],
  cs: ["Dobré ráno", "Dobrý den", "Dobrý večer"],
  ro: ["Bună dimineața", "Bună ziua", "Bună seara"],
  hu: ["Jó reggelt", "Jó napot", "Jó estét"],
  tr: ["Günaydın", "İyi günler", "İyi akşamlar"],
  el: ["Καλημέρα", "Καλησπέρα", "Καλησπέρα"],
  id: ["Selamat pagi", "Selamat siang", "Selamat malam"],
  ja: ["おはようございます", "こんにちは", "こんばんは"],
  ko: ["좋은 아침입니다", "안녕하세요", "안녕하세요"],
  zh: ["早上好", "下午好", "晚上好"],
  ar: ["صباح الخير", "مساء الخير", "مساء الخير"],
  he: ["בוקר טוב", "צהריים טובים", "ערב טוב"],
  th: ["สวัสดีตอนเช้า", "สวัสดีตอนบ่าย", "สวัสดีตอนเย็น"],
  vi: ["Chào buổi sáng", "Chào buổi chiều", "Chào buổi tối"],
};

export function greeting(lang = "pt"): string {
  const g = GREETINGS[baseLang(lang)] ?? GREETINGS.en;
  const h = new Date().getHours();
  if (h < 12) return g[0];
  if (h < 18) return g[1];
  return g[2];
}

export function shortName(name: string): string {
  const cleaned = name
    .replace(/\b(ltda|me|mei|eireli|epp|s\/a|sa|llc|inc|ltd|gmbh|srl|sl|sas)\b\.?/gi, "")
    .replace(/[-–|].*$/, "")
    .trim();
  return cleaned.split(/\s+/).slice(0, 3).join(" ");
}

export function renderTemplate(text: string, lead: Lead, me: { name: string; business: string }): string {
  const lang = lead.lang || "pt-BR";
  const topIssue = lead.audit?.issues?.[0];
  const problema = topIssue ? topIssue.pitch.split(/[—–]/)[0].trim().replace(/\.$/, "") : "";
  const map: Record<string, string> = {
    "{empresa}": shortName(lead.name),
    "{empresa_completa}": lead.name,
    "{cidade}": lead.city,
    "{nicho}": lead.niche.toLowerCase(),
    "{meu_nome}": me.name || "",
    "{minha_empresa}": me.business || "",
    "{saudacao}": greeting(lang),
    "{problema_site}": problema,
    "{nota_site}": lead.audit ? String(lead.audit.score) : "",
  };
  let out = text;
  for (const [k, v] of Object.entries(map)) out = out.split(k).join(v);
  // Se alguma variável ficou vazia (ex.: sem nome), evita " ." e espaços duplos
  return out
    .replace(/\s+([.,!?;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
