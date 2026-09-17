import { extractInstagramHandles, handleMatchesName } from "./social";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function fetchText(url: string, ms = 7000): Promise<{ html: string; status: number }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  const viaJina = url.startsWith("https://r.jina.ai/");
  try {
    const res = await fetch(url, {
      headers: viaJina
        ? // O proxy r.jina.ai bloqueia User-Agent de navegador (Cloudflare); um UA simples passa.
          { "User-Agent": "ProspectLife/1.0 (+https://github.com/guihass/prospectlife)", Accept: "text/plain", "X-Return-Format": "text" }
        : {
            "User-Agent": UA,
            "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
            Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
          },
      signal: ctrl.signal,
      cache: "no-store",
      redirect: "follow",
    });
    const html = res.ok ? await res.text() : "";
    return { html, status: res.status };
  } catch {
    return { html: "", status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

export interface InstagramResult {
  handle: string;
  url: string;
  confidence: "alta" | "media";
}

/**
 * Procura o Instagram de uma empresa usando buscadores públicos.
 * Vários buscadores são tentados em sequência porque alguns bloqueiam
 * servidores em nuvem. Para no primeiro que devolver um perfil que
 * "parece" com o nome da empresa.
 */
export async function findInstagram(name: string, city: string): Promise<{ result: InstagramResult | null; tried: string[] }> {
  const q = `"${name}" ${city} instagram`;
  const qSite = `${name} ${city} site:instagram.com`;
  const enc = encodeURIComponent;
  const ddg = `https://html.duckduckgo.com/html/?q=${enc(q)}`;
  const ddgLite = `https://lite.duckduckgo.com/lite/?q=${enc(q)}`;
  const sources: [string, string][] = [
    // Acesso direto (funciona rodando local / em servidor próprio)
    ["ddg-html", ddg],
    // Servidores em nuvem (Vercel) costumam ser bloqueados pelos buscadores;
    // o leitor público r.jina.ai busca a página por nós.
    ["jina-ddg", `https://r.jina.ai/${ddg}`],
    ["jina-ddg-lite", `https://r.jina.ai/${ddgLite}`],
    ["bing", `https://www.bing.com/search?q=${enc(qSite)}&setlang=pt-BR&cc=BR`],
    ["brave", `https://search.brave.com/search?q=${enc(q)}&source=web`],
    ["mojeek", `https://www.mojeek.com/search?q=${enc(qSite)}`],
  ];

  const candidates: string[] = [];
  const tried: string[] = [];
  for (const [label, src] of sources) {
    let { html, status } = await fetchText(src, label.startsWith("jina") ? 20000 : 7000);
    if (status === 429 && label.startsWith("jina")) {
      // limite de taxa do proxy: espera um pouco e tenta de novo uma vez
      await new Promise((r) => setTimeout(r, 3500));
      ({ html, status } = await fetchText(src, 20000));
    }
    const found = html ? extractInstagramHandles(html) : [];
    tried.push(`${label}:${status}:${found.length}`);
    for (const h of found) if (!candidates.includes(h)) candidates.push(h);
    if (candidates.some((h) => handleMatchesName(h, name))) break;
  }

  if (!candidates.length) return { result: null, tried };

  const best = candidates.find((h) => handleMatchesName(h, name)) ?? candidates[0];
  return {
    result: {
      handle: best,
      url: `https://instagram.com/${best}`,
      confidence: handleMatchesName(best, name) ? "alta" : "media",
    },
    tried,
  };
}
