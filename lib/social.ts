import type { SiteType } from "./types";

/**
 * Muitas empresas pequenas colocam o Instagram, Facebook ou Linktree no campo
 * "site" do Google. Para o ProspectLife isso conta como "SEM site" (só rede social),
 * porque é exatamente o tipo de cliente que precisa de um site de verdade.
 */
const SOCIAL_HOSTS = [
  "instagram.com",
  "facebook.com",
  "fb.com",
  "m.facebook.com",
  "linktr.ee",
  "linktree.com",
  "lnk.bio",
  "bio.site",
  "beacons.ai",
  "beacons.page",
  "wa.me",
  "api.whatsapp.com",
  "whatsapp.com",
  "ifood.com.br",
  "tiktok.com",
  "youtube.com",
  "twitter.com",
  "x.com",
  "t.me",
  "telegram.me",
  "linkedin.com",
  "goo.gl",
  "maps.app.goo.gl",
  "google.com",
  "business.site",
  "negocio.site",
  "sites.google.com",
  "rappi.com",
  "99food.com",
  "getninjas.com.br",
  "olx.com.br",
  "mercadolivre.com.br",
  "shopee.com.br",
  "airbnb.com",
  "booking.com",
  "tripadvisor.com",
  "pinterest.com",
  "kwai.com",
  "taplink.cc",
  "campsite.bio",
  "allmylinks.com",
  "solo.to",
  "carrd.co",
];

const IG_RESERVED = new Set([
  "p", "explore", "reel", "reels", "accounts", "stories", "tags", "share",
  "about", "developer", "directory", "legal", "privacy", "terms", "tv",
  "locations", "static", "web", "api", "s", "invites", "challenge",
]);

export function hostOf(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : "https://" + url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function classifyWebsite(url: string | null | undefined): SiteType {
  if (!url) return "none";
  const host = hostOf(url);
  if (!host) return "none";
  if (SOCIAL_HOSTS.some((h) => host === h || host.endsWith("." + h))) return "social";
  return "site";
}

/** Extrai @handle de uma URL do Instagram. */
export function instagramHandleFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/instagram\.com\/([A-Za-z0-9_.]{2,30})/i);
  if (!m) return null;
  const handle = m[1].replace(/\.+$/, "");
  if (IG_RESERVED.has(handle.toLowerCase())) return null;
  return handle;
}

/** Acha todos os handles do Instagram num HTML qualquer. */
export function extractInstagramHandles(html: string): string[] {
  const out: string[] = [];
  const re = /instagram\.com\/([A-Za-z0-9_.]{2,30})/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const h = m[1].replace(/\.+$/, "");
    if (IG_RESERVED.has(h.toLowerCase())) continue;
    if (!out.includes(h)) out.push(h);
  }
  return out;
}

/** Normaliza texto para comparar nomes (remove acentos, símbolos, etc.) */
export function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Mede se o handle "parece" com o nome da empresa. */
export function handleMatchesName(handle: string, name: string): boolean {
  const h = slug(handle);
  const n = slug(name);
  if (!h || !n) return false;
  if (h.includes(n) || n.includes(h)) return true;
  // compara palavras significativas do nome
  const words = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !["ltda", "eireli", "mei", "epp", "comercio", "servicos", "casa", "loja"].includes(w));
  return words.some((w) => h.includes(w));
}
