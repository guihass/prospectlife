import type { Lead } from "./types";
import { getCountry } from "./countries";
import { normalizePhone, phoneType } from "./phone";
import { classifyWebsite, instagramHandleFromUrl } from "./social";

interface GooglePlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
}

interface GoogleResponse {
  places?: GooglePlace[];
  nextPageToken?: string;
  error?: { message?: string; status?: string };
}

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.rating",
  "places.userRatingCount",
  "places.businessStatus",
  "nextPageToken",
].join(",");

export async function searchGoogle(opts: {
  apiKey: string;
  countryCode: string;
  city: string;
  niche: string;
  maxPages?: number;
}): Promise<{ leads: Lead[]; warnings: string[]; totalFound: number }> {
  const country = getCountry(opts.countryCode);
  const warnings: string[] = [];
  const leads: Lead[] = [];
  const query = `${opts.niche} em ${opts.city}, ${country.name}`;
  let pageToken: string | undefined;
  let totalFound = 0;
  const maxPages = Math.min(Math.max(opts.maxPages ?? 3, 1), 3);

  for (let page = 0; page < maxPages; page++) {
    const body: Record<string, unknown> = {
      textQuery: query,
      pageSize: 20,
      languageCode: country.lang,
      regionCode: country.code,
    };
    if (pageToken) body.pageToken = pageToken;

    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": opts.apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as GoogleResponse;

    if (!res.ok) {
      const msg = data?.error?.message || `HTTP ${res.status}`;
      if (res.status === 403 || res.status === 400) {
        throw new Error(
          `Google recusou a chave (${msg}). Verifique se a "Places API (New)" está ativada e se a chave não tem restrição de site/IP.`
        );
      }
      throw new Error(`Erro do Google Places: ${msg}`);
    }

    const places = data.places ?? [];
    totalFound += places.length;

    for (const p of places) {
      if (p.businessStatus && p.businessStatus !== "OPERATIONAL") continue;
      const name = p.displayName?.text?.trim();
      if (!name) continue;

      const siteType = classifyWebsite(p.websiteUri);
      const phone = normalizePhone(p.internationalPhoneNumber || p.nationalPhoneNumber, country.dial);
      const igFromSite = siteType === "social" ? instagramHandleFromUrl(p.websiteUri) : null;

      leads.push({
        id: "g_" + p.id,
        name,
        address: p.formattedAddress ?? "",
        phoneRaw: p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? null,
        phoneE164: phone?.e164 ?? null,
        whatsapp: phone?.whatsapp ?? null,
        website: siteType === "site" ? p.websiteUri! : null,
        siteType,
        instagram: igFromSite,
        instagramUrl: igFromSite ? `https://instagram.com/${igFromSite}` : null,
        instagramConfidence: igFromSite ? "fonte" : null,
        phoneType: phoneType(phone?.e164 ?? null, country.dial),
        waStatus: "nao_verificado",
        rating: p.rating ?? null,
        ratingCount: p.userRatingCount ?? null,
        mapsUrl: p.googleMapsUri ?? null,
        source: "google",
        city: opts.city,
        niche: opts.niche,
        countryCode: country.code,
        lang: country.lang,
      });
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  if (totalFound === 0) warnings.push(`Google não retornou resultados para "${query}".`);
  return { leads, warnings, totalFound };
}
