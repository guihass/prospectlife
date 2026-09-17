import { extractInstagramHandles, handleMatchesName } from "./social";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function fetchText(url: string, ms = 7000): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8" },
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
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
 * Estratégia: busca "nome cidade instagram" no DuckDuckGo e no Bing e
 * pega o primeiro perfil instagram.com/xxx que apareça. Se o handle
 * parecer com o nome da empresa, marca confiança "alta".
 */
export async function findInstagram(name: string, city: string): Promise<InstagramResult | null> {
  const q = `"${name}" ${city} instagram`;
  const sources = [
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`,
    `https://www.bing.com/search?q=${encodeURIComponent(q + " site:instagram.com")}&setlang=pt-BR`,
  ];

  const candidates: string[] = [];
  for (const src of sources) {
    const html = await fetchText(src);
    if (!html) continue;
    for (const h of extractInstagramHandles(html)) if (!candidates.includes(h)) candidates.push(h);
    if (candidates.some((h) => handleMatchesName(h, name))) break;
  }

  if (!candidates.length) return null;

  const best = candidates.find((h) => handleMatchesName(h, name)) ?? candidates[0];
  return {
    handle: best,
    url: `https://instagram.com/${best}`,
    confidence: handleMatchesName(best, name) ? "alta" : "media",
  };
}
