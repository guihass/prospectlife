import type { AuditIssue, SiteAudit } from "./types";

const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const FREE_BUILDERS: [RegExp, string][] = [
  [/wixsite\.com|wix\.com|parastorage/i, "Wix (plano gratuito)"],
  [/blogspot\.com|blogger\.com/i, "Blogger"],
  [/wordpress\.com/i, "WordPress.com gratuito"],
  [/weebly\.com/i, "Weebly"],
  [/webnode\.com|webnode\.com\.br/i, "Webnode"],
  [/site123\.me/i, "SITE123"],
  [/negocio\.site|business\.site/i, "Google Meu Negócio (site básico)"],
  [/godaddysites\.com/i, "GoDaddy Website Builder"],
  [/lojaintegrada\.com\.br/i, "Loja Integrada (subdomínio)"],
  [/nuvemshop\.com\.br|lojavirtualnuvem/i, "Nuvemshop (subdomínio)"],
  [/hostgator\.com\.br\/site/i, "Criador HostGator"],
  [/ueniweb|ueni\.com/i, "UENI"],
  [/strikingly\.com/i, "Strikingly"],
  [/carrd\.co/i, "Carrd"],
];

function issue(severity: AuditIssue["severity"], title: string, detail: string, pitch: string): AuditIssue {
  return { severity, title, detail, pitch };
}

function normalizeUrl(url: string): string {
  let u = url.trim();
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  return u;
}

async function fetchSite(url: string, ms = 12000): Promise<{ res: Response | null; html: string; error: string | null; elapsedMs: number }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  const start = Date.now();
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9", Accept: "text/html,*/*" },
      redirect: "follow",
      signal: ctrl.signal,
      cache: "no-store",
    });
    const html = await res.text();
    return { res, html, error: null, elapsedMs: Date.now() - start };
  } catch (e) {
    const msg = e instanceof Error ? (e.name === "AbortError" ? "Tempo esgotado (site muito lento ou fora do ar)" : e.message) : "Erro desconhecido";
    return { res: null, html: "", error: msg, elapsedMs: Date.now() - start };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Analisa o site de uma empresa e devolve uma lista de problemas
 * (com argumento de venda pronto) e um veredito de experiência mobile.
 * Funciona só com o HTML da página inicial — rápido e sem custo.
 */
export async function auditSite(rawUrl: string): Promise<SiteAudit> {
  const url = normalizeUrl(rawUrl);
  const issues: AuditIssue[] = [];
  const positives: string[] = [];
  const tech: string[] = [];

  let attempt = await fetchSite(url);
  // Se HTTPS falhar, tenta HTTP (muito site antigo não tem certificado)
  let downgradedToHttp = false;
  if (!attempt.res && url.startsWith("https://")) {
    const httpUrl = url.replace(/^https:\/\//, "http://");
    const second = await fetchSite(httpUrl);
    if (second.res) {
      attempt = second;
      downgradedToHttp = true;
    }
  }

  const base: SiteAudit = {
    url: rawUrl,
    finalUrl: attempt.res?.url ?? url,
    ok: false,
    status: attempt.res?.status ?? null,
    error: attempt.error,
    score: 0,
    issues,
    positives,
    mobile: { viewport: false, mediaQueries: false, responsiveFramework: null, verdict: "desconhecida" },
    tech,
  };

  if (!attempt.res) {
    issues.push(
      issue(
        "alta",
        "Site fora do ar ou inacessível",
        attempt.error ?? "Não foi possível carregar a página.",
        "O site de vocês não abriu quando tentei acessar — cliente que tenta entrar e não consegue vai direto pro concorrente."
      )
    );
    return { ...base, score: 0 };
  }

  const res = attempt.res;
  const html = attempt.html;
  const lower = html.toLowerCase();
  const finalUrl = res.url || url;
  const isHttps = finalUrl.startsWith("https://") && !downgradedToHttp;

  if (res.status >= 400) {
    issues.push(
      issue(
        "alta",
        `Página responde com erro ${res.status}`,
        "O endereço cadastrado no Google leva a uma página de erro.",
        "O link que aparece no Google de vocês está dando erro — quem clica cai numa página quebrada."
      )
    );
  }

  // ---------- Segurança ----------
  if (!isHttps) {
    issues.push(
      issue(
        "alta",
        "Sem HTTPS (cadeado de segurança)",
        "O site abre só em http://. Navegadores mostram aviso de 'Não seguro'.",
        "O Chrome está marcando o site de vocês como 'Não seguro' — isso assusta cliente e o Google penaliza no ranking."
      )
    );
  } else positives.push("Tem HTTPS (cadeado)");

  if (isHttps && /src=["']http:\/\//i.test(html)) {
    issues.push(
      issue(
        "media",
        "Conteúdo misto (imagens/scripts em http)",
        "Parte do conteúdo carrega sem segurança; o navegador pode bloquear.",
        "Algumas imagens e recursos do site carregam sem segurança, então o cadeado aparece quebrado em vários celulares."
      )
    );
  }

  // ---------- Mobile ----------
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  const hasMedia = /@media[^{]*\(\s*(max|min)-width/i.test(html);
  let framework: string | null = null;
  if (/bootstrap(\.min)?\.css|class=["'][^"']*\bcol-(sm|md|lg)-/i.test(html)) framework = "Bootstrap";
  else if (/tailwind|class=["'][^"']*\b(sm|md|lg):/i.test(html)) framework = "Tailwind";
  else if (/elementor/i.test(html)) framework = "Elementor (WordPress)";
  else if (/wp-content/i.test(html)) framework = "WordPress";
  else if (/wix\.com|parastorage/i.test(html)) framework = "Wix";
  else if (/shopify/i.test(html)) framework = "Shopify";
  else if (/squarespace/i.test(html)) framework = "Squarespace";
  else if (/nuvemshop|lojaintegrada|tray\.com\.br|vtex/i.test(html)) framework = "Plataforma de e-commerce";
  if (framework) tech.push(framework);

  let verdict: SiteAudit["mobile"]["verdict"];
  if (!hasViewport) {
    verdict = "ruim";
    issues.push(
      issue(
        "alta",
        "Não é adaptado para celular (sem meta viewport)",
        "Sem a tag viewport o site aparece minúsculo no celular e o usuário precisa dar zoom.",
        "Abri o site de vocês no celular e ele aparece 'espremido', tem que dar zoom pra ler — e hoje mais de 70% dos acessos vêm do celular."
      )
    );
  } else if (!hasMedia && !framework) {
    verdict = "duvidosa";
    issues.push(
      issue(
        "media",
        "Responsividade incerta no mobile",
        "Tem viewport, mas não encontrei regras de layout para telas pequenas.",
        "No celular alguns blocos do site parecem não se ajustar direito à tela — vale uma revisão do layout mobile."
      )
    );
  } else {
    verdict = "boa";
    positives.push("Layout preparado para celular");
  }

  const hasFixedWidthTables = (html.match(/<table[^>]+width=["']?\d{3,}/gi) || []).length > 0;
  if (hasFixedWidthTables) {
    verdict = verdict === "boa" ? "duvidosa" : verdict;
    issues.push(
      issue(
        "media",
        "Layout com tabelas de largura fixa",
        "Técnica antiga que quebra em telas pequenas.",
        "O site foi montado com uma técnica antiga (tabelas fixas) que estoura a tela do celular."
      )
    );
  }

  if (/<object[^>]+shockwave|\.swf["']|application\/x-shockwave-flash/i.test(html)) {
    verdict = "ruim";
    issues.push(
      issue(
        "alta",
        "Usa Flash",
        "Flash não funciona em nenhum navegador moderno nem em celular.",
        "O site usa Flash, que não abre em nenhum celular e em nenhum navegador atual — boa parte do site está invisível."
      )
    );
  }

  if (/\bhttp-equiv=["']refresh["']/i.test(html) || /<frameset/i.test(html)) {
    issues.push(
      issue(
        "media",
        "Redirecionamento ou frames antigos",
        "Uso de meta refresh ou frameset — práticas obsoletas que confundem o Google.",
        "O site usa uma estrutura antiga (frames/redirecionamento automático) que atrapalha o Google a indexar as páginas."
      )
    );
  }

  // ---------- SEO / conteúdo ----------
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1]?.replace(/\s+/g, " ").trim() ?? "";
  if (!title) {
    issues.push(
      issue(
        "alta",
        "Página sem título",
        "A tag <title> está vazia — é o texto azul que aparece no Google.",
        "O site de vocês aparece no Google sem título — perde clique pra quem tem um título chamativo."
      )
    );
  } else if (title.length < 10 || /^(home|início|inicio|untitled|index|bem[- ]vindo|welcome|nova p[áa]gina|site)$/i.test(title)) {
    issues.push(
      issue(
        "media",
        `Título genérico: "${title}"`,
        "Títulos como 'Home' ou 'Bem-vindo' não ajudam o Google a entender o negócio.",
        `O título do site é só "${title}" — o Google não sabe que vocês vendem o que vendem, e isso derruba o ranking.`
      )
    );
  } else positives.push(`Título: "${title.slice(0, 60)}"`);

  const hasDescription = /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{20,}/i.test(html);
  if (!hasDescription) {
    issues.push(
      issue(
        "media",
        "Sem meta description",
        "É o texto cinza que aparece embaixo do título no Google.",
        "No Google, embaixo do nome de vocês aparece um texto aleatório em vez de uma frase que vende — falta a meta description."
      )
    );
  } else positives.push("Tem meta description");

  if (!/<h1[\s>]/i.test(html)) {
    issues.push(
      issue(
        "baixa",
        "Sem título principal (H1)",
        "O Google usa o H1 para entender o assunto da página.",
        "A página inicial não tem um título principal — o Google fica sem saber qual é o foco do negócio."
      )
    );
  }

  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  const imgsNoAlt = imgs.filter((i) => !/\balt=/i.test(i)).length;
  if (imgs.length > 0 && imgsNoAlt / imgs.length > 0.5) {
    issues.push(
      issue(
        "baixa",
        `Imagens sem descrição (${imgsNoAlt} de ${imgs.length})`,
        "Sem o atributo alt o Google Imagens não indexa e leitores de tela não funcionam.",
        "As fotos do site não têm descrição — vocês não aparecem no Google Imagens."
      )
    );
  }

  const yearMatch = html.match(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/i);
  const thisYear = new Date().getFullYear();
  if (yearMatch) {
    const y = Number(yearMatch[1]);
    if (y && thisYear - y >= 2) {
      issues.push(
        issue(
          "media",
          `Rodapé desatualizado (© ${y})`,
          "Passa a impressão de site abandonado.",
          `O rodapé do site ainda diz © ${y} — cliente vê isso e pensa que a empresa fechou ou não cuida da presença online.`
        )
      );
    }
  }

  if (/em constru[cç][aã]o|under construction|coming soon|em breve um novo site|site em manuten/i.test(lower)) {
    issues.push(
      issue(
        "alta",
        "Site 'em construção'",
        "A página inicial avisa que o site não está pronto.",
        "O site está marcado como 'em construção' — na prática vocês não têm site, e o Google mostra isso pros clientes."
      )
    );
  }

  if (/lorem ipsum/i.test(lower)) {
    issues.push(
      issue(
        "alta",
        "Texto de exemplo (Lorem ipsum) publicado",
        "Ficou texto de modelo no site.",
        "Tem texto de modelo ('Lorem ipsum') publicado no site — parece que ficou pela metade."
      )
    );
  }

  for (const [re, name] of FREE_BUILDERS) {
    if (re.test(finalUrl) || re.test(html.slice(0, 20000))) {
      tech.push(name);
      if (/\.(wixsite|blogspot|wordpress|weebly|webnode|site123|godaddysites|strikingly)\.|negocio\.site|business\.site|carrd\.co/i.test(finalUrl)) {
        issues.push(
          issue(
            "media",
            `Site em construtor gratuito (${name}) sem domínio próprio`,
            "Endereço com subdomínio da plataforma e, geralmente, anúncios da própria plataforma.",
            `O site está num plano gratuito (${name}) com o endereço da plataforma — passa pouca credibilidade e ainda mostra propaganda de terceiros.`
          )
        );
      }
      break;
    }
  }

  // ---------- Conversão / contato ----------
  const hasWhats = /wa\.me|api\.whatsapp\.com|whatsapp:\/\/|whatsapp\.com\/send/i.test(html);
  if (!hasWhats) {
    issues.push(
      issue(
        "media",
        "Sem botão de WhatsApp",
        "Não achei link direto para WhatsApp — principal canal de contato no Brasil.",
        "O site não tem botão de WhatsApp — o cliente precisa copiar o número na mão, e a maioria desiste."
      )
    );
  } else positives.push("Tem botão de WhatsApp");

  if (!/tel:|\(\d{2}\)\s?\d{4,5}-?\d{4}|\+\d{2}\s?\d{2}/.test(html)) {
    issues.push(
      issue(
        "baixa",
        "Telefone não aparece na página inicial",
        "Contato escondido = menos ligações.",
        "O telefone não está visível na primeira tela — cliente com pressa não vai procurar."
      )
    );
  }

  if (!/instagram\.com\//i.test(html) && !/facebook\.com\//i.test(html)) {
    issues.push(
      issue(
        "baixa",
        "Sem links para redes sociais",
        "Não encontrei Instagram nem Facebook no site.",
        "O site não leva pro Instagram de vocês — está perdendo seguidor de graça."
      )
    );
  }

  const hasFavicon = /<link[^>]+rel=["'][^"']*icon[^"']*["']/i.test(html);
  if (!hasFavicon) {
    issues.push(
      issue(
        "baixa",
        "Sem ícone (favicon)",
        "Aba do navegador fica com ícone genérico.",
        "O site não tem aquele ícone na aba do navegador — detalhe pequeno, mas mostra falta de acabamento."
      )
    );
  }

  const hasOg = /<meta[^>]+property=["']og:/i.test(html);
  if (!hasOg) {
    issues.push(
      issue(
        "baixa",
        "Sem prévia para compartilhamento (Open Graph)",
        "Quando alguém manda o link no WhatsApp, não aparece foto nem descrição.",
        "Quando alguém compartilha o link de vocês no WhatsApp não aparece foto nem descrição — só um link seco."
      )
    );
  } else positives.push("Prévia de compartilhamento configurada");

  if (/<script[^>]+jquery-1\.\d/i.test(html) || /jquery\/1\.[0-9]/i.test(html)) {
    tech.push("jQuery 1.x (antigo)");
    issues.push(
      issue(
        "baixa",
        "Biblioteca JavaScript muito antiga (jQuery 1.x)",
        "Versões antigas têm falhas de segurança conhecidas.",
        "O site roda em cima de uma biblioteca de 2012 com falhas de segurança já conhecidas."
      )
    );
  }

  // ---------- Performance (aproximada) ----------
  const sizeKb = Math.round(Buffer.byteLength(html, "utf8") / 1024);
  if (sizeKb > 900) {
    issues.push(
      issue(
        "media",
        `Página inicial muito pesada (${sizeKb} KB só de HTML)`,
        "HTML grande demais demora para carregar no 4G.",
        "A página inicial é muito pesada — no 4G demora pra abrir e o cliente fecha antes de carregar."
      )
    );
  }
  if (attempt.elapsedMs > 5000) {
    issues.push(
      issue(
        "media",
        `Resposta lenta do servidor (${(attempt.elapsedMs / 1000).toFixed(1)}s)`,
        "O servidor demorou mais de 5 segundos para responder.",
        `O site demorou ${(attempt.elapsedMs / 1000).toFixed(0)} segundos só pra começar a abrir — o Google considera lento acima de 3s.`
      )
    );
  } else positives.push(`Servidor respondeu em ${(attempt.elapsedMs / 1000).toFixed(1)}s`);

  // ---------- Nota ----------
  let score = 100;
  for (const i of issues) score -= i.severity === "alta" ? 20 : i.severity === "media" ? 10 : 4;
  score = Math.max(0, Math.min(100, score));

  issues.sort((a, b) => {
    const w = { alta: 0, media: 1, baixa: 2 };
    return w[a.severity] - w[b.severity];
  });

  return {
    ...base,
    ok: res.status < 400,
    finalUrl,
    score,
    mobile: { viewport: hasViewport, mediaQueries: hasMedia, responsiveFramework: framework, verdict },
  };
}
