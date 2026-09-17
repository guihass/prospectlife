import type { Lead } from "./types";
import { getCountry } from "./countries";
import { normalizePhone } from "./phone";
import { classifyWebsite, instagramHandleFromUrl } from "./social";

/**
 * Modo GRATUITO (sem chave): usa OpenStreetMap.
 *  1. Nominatim descobre a área da cidade.
 *  2. Overpass busca estabelecimentos por nome e por categoria.
 * Dados de telefone/Instagram são mais escassos que no Google, mas é 100% grátis.
 */

const UA = "ProspectLife/1.0 (ferramenta gratuita de prospeccao; contato via GitHub)";

// Palavras-chave (pt/en/es) -> tags do OpenStreetMap
const NICHE_TAGS: Record<string, string[]> = {
  restaurante: ['"amenity"="restaurant"'],
  restaurant: ['"amenity"="restaurant"'],
  pizzaria: ['"cuisine"~"pizza"'],
  pizza: ['"cuisine"~"pizza"'],
  hamburgueria: ['"cuisine"~"burger"', '"amenity"="fast_food"'],
  lanchonete: ['"amenity"="fast_food"', '"amenity"="cafe"'],
  cafeteria: ['"amenity"="cafe"'],
  cafe: ['"amenity"="cafe"'],
  padaria: ['"shop"="bakery"'],
  bakery: ['"shop"="bakery"'],
  confeitaria: ['"shop"="pastry"', '"shop"="confectionery"'],
  bar: ['"amenity"="bar"', '"amenity"="pub"'],
  sorveteria: ['"amenity"="ice_cream"', '"shop"="ice_cream"'],
  acougue: ['"shop"="butcher"'],
  mercado: ['"shop"="supermarket"', '"shop"="convenience"'],
  mercearia: ['"shop"="convenience"', '"shop"="grocery"'],
  hortifruti: ['"shop"="greengrocer"'],
  farmacia: ['"amenity"="pharmacy"'],
  pharmacy: ['"amenity"="pharmacy"'],
  petshop: ['"shop"="pet"'],
  pet: ['"shop"="pet"', '"amenity"="veterinary"'],
  veterinario: ['"amenity"="veterinary"'],
  veterinaria: ['"amenity"="veterinary"'],
  dentista: ['"amenity"="dentist"', '"healthcare"="dentist"'],
  dentist: ['"amenity"="dentist"'],
  odontologia: ['"amenity"="dentist"'],
  clinica: ['"amenity"="clinic"', '"healthcare"="clinic"'],
  medico: ['"amenity"="doctors"', '"healthcare"="doctor"'],
  fisioterapia: ['"healthcare"="physiotherapist"'],
  psicologo: ['"healthcare"="psychotherapist"'],
  nutricionista: ['"healthcare"="nutrition_counselling"'],
  academia: ['"leisure"="fitness_centre"'],
  gym: ['"leisure"="fitness_centre"'],
  crossfit: ['"leisure"="fitness_centre"'],
  pilates: ['"leisure"="fitness_centre"', '"sport"="pilates"'],
  salao: ['"shop"="hairdresser"', '"shop"="beauty"'],
  cabeleireiro: ['"shop"="hairdresser"'],
  barbearia: ['"shop"="hairdresser"', '"shop"="barber"'],
  barber: ['"shop"="hairdresser"'],
  estetica: ['"shop"="beauty"'],
  manicure: ['"shop"="beauty"'],
  tatuagem: ['"shop"="tattoo"'],
  tattoo: ['"shop"="tattoo"'],
  otica: ['"shop"="optician"'],
  roupas: ['"shop"="clothes"'],
  loja: ['"shop"'],
  boutique: ['"shop"="clothes"', '"shop"="boutique"'],
  calcados: ['"shop"="shoes"'],
  joalheria: ['"shop"="jewelry"'],
  floricultura: ['"shop"="florist"'],
  papelaria: ['"shop"="stationery"'],
  livraria: ['"shop"="books"'],
  moveis: ['"shop"="furniture"'],
  eletronicos: ['"shop"="electronics"'],
  celular: ['"shop"="mobile_phone"'],
  informatica: ['"shop"="computer"'],
  assistencia: ['"shop"="computer"', '"shop"="mobile_phone"', '"craft"="electronics_repair"'],
  oficina: ['"shop"="car_repair"'],
  mecanica: ['"shop"="car_repair"'],
  autopecas: ['"shop"="car_parts"'],
  lavacar: ['"amenity"="car_wash"'],
  borracharia: ['"shop"="tyres"'],
  concessionaria: ['"shop"="car"'],
  moto: ['"shop"="motorcycle"', '"shop"="motorcycle_repair"'],
  bicicleta: ['"shop"="bicycle"'],
  imobiliaria: ['"office"="estate_agent"'],
  advogado: ['"office"="lawyer"'],
  advocacia: ['"office"="lawyer"'],
  contabilidade: ['"office"="accountant"'],
  contador: ['"office"="accountant"'],
  seguros: ['"office"="insurance"'],
  arquiteto: ['"office"="architect"'],
  engenharia: ['"office"="engineer"'],
  escola: ['"amenity"="school"'],
  curso: ['"amenity"="training"', '"amenity"="language_school"'],
  idiomas: ['"amenity"="language_school"'],
  autoescola: ['"amenity"="driving_school"'],
  creche: ['"amenity"="kindergarten"', '"amenity"="childcare"'],
  hotel: ['"tourism"="hotel"'],
  pousada: ['"tourism"="guest_house"', '"tourism"="hotel"'],
  hostel: ['"tourism"="hostel"'],
  eletricista: ['"craft"="electrician"'],
  encanador: ['"craft"="plumber"'],
  pintor: ['"craft"="painter"'],
  marcenaria: ['"craft"="carpenter"'],
  serralheria: ['"craft"="metal_construction"', '"craft"="blacksmith"'],
  vidracaria: ['"craft"="glaziery"', '"shop"="glaziery"'],
  construcao: ['"shop"="hardware"', '"shop"="doityourself"'],
  materiais: ['"shop"="hardware"', '"shop"="doityourself"'],
  tintas: ['"shop"="paint"'],
  lavanderia: ['"shop"="laundry"', '"shop"="dry_cleaning"'],
  costureira: ['"craft"="tailor"', '"shop"="tailor"'],
  chaveiro: ['"craft"="locksmith"', '"shop"="locksmith"'],
  fotografo: ['"craft"="photographer"', '"shop"="photo"'],
  grafica: ['"shop"="copyshop"', '"craft"="printer"'],
  agencia: ['"office"="advertising_agency"', '"office"="travel_agent"'],
  turismo: ['"office"="travel_agent"', '"shop"="travel_agency"'],
  igreja: ['"amenity"="place_of_worship"'],
  dance: ['"leisure"="dance"'],
  danca: ['"leisure"="dance"'],
  musica: ['"shop"="musical_instrument"', '"amenity"="music_school"'],
  brinquedos: ['"shop"="toys"'],
  bebe: ['"shop"="baby_goods"'],
  presentes: ['"shop"="gift"'],
  perfumaria: ['"shop"="perfumery"', '"shop"="cosmetics"'],
  cosmeticos: ['"shop"="cosmetics"'],
  suplementos: ['"shop"="nutrition_supplements"'],
  distribuidora: ['"shop"="wholesale"', '"shop"="alcohol"'],
  bebidas: ['"shop"="alcohol"', '"shop"="beverages"'],
  tabacaria: ['"shop"="tobacco"'],
  funeraria: ['"shop"="funeral_directors"'],
  estacionamento: ['"amenity"="parking"'],
  posto: ['"amenity"="fuel"'],
  dedetizadora: ['"office"'],
  transportadora: ['"office"="logistics"'],
  coworking: ['"office"="coworking"'],
};

function normalizeNiche(niche: string): string {
  return niche
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

interface NominatimResult {
  boundingbox: [string, string, string, string]; // south, north, west, east
  display_name: string;
  osm_id: number;
  osm_type: string;
}

async function geocodeCity(city: string, countryCode: string): Promise<NominatimResult | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", city);
  url.searchParams.set("countrycodes", countryCode.toLowerCase());
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("featureType", "city");
  const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "pt-BR" }, cache: "no-store" });
  if (!res.ok) return null;
  let data = (await res.json()) as NominatimResult[];
  if (!data.length) {
    // tenta sem restringir a "city" (ex.: bairros / distritos)
    url.searchParams.delete("featureType");
    const res2 = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
    data = res2.ok ? ((await res2.json()) as NominatimResult[]) : [];
  }
  return data[0] ?? null;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export async function searchOSM(opts: {
  countryCode: string;
  city: string;
  niche: string;
}): Promise<{ leads: Lead[]; warnings: string[]; totalFound: number }> {
  const country = getCountry(opts.countryCode);
  const warnings: string[] = [];

  const geo = await geocodeCity(opts.city, opts.countryCode);
  if (!geo) {
    throw new Error(`Não encontrei a cidade "${opts.city}" no OpenStreetMap. Tente escrever "Cidade, Estado".`);
  }
  const [south, north, west, east] = geo.boundingbox.map(Number);
  const bbox = `${south},${west},${north},${east}`;

  const nicheNorm = normalizeNiche(opts.niche);
  const nicheWords = nicheNorm.split(/[^a-z0-9]+/).filter(Boolean);
  const nicheJoined = nicheWords.join("");
  const tagFilters = new Set<string>();
  for (const [kw, tags] of Object.entries(NICHE_TAGS)) {
    // Casa palavra inteira (ou plural simples), nunca substring: "barbearia" não pode virar "bar"
    const hit = nicheWords.some((w) => w === kw || w === kw + "s" || w === kw + "es") || nicheJoined === kw || nicheJoined === kw + "s";
    if (hit) tags.forEach((t) => tagFilters.add(t));
  }

  // Regex para bater no nome (ex.: "Pizzaria do Zé")
  const nameRegex = nicheNorm.replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter(Boolean).join("|");

  const parts: string[] = [];
  if (nameRegex) parts.push(`nwr["name"~"${nameRegex}",i](${bbox});`);
  for (const t of tagFilters) parts.push(`nwr[${t}]["name"](${bbox});`);

  const query = `[out:json][timeout:40];(${parts.join("")});out center tags 300;`;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
    body: "data=" + encodeURIComponent(query),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`OpenStreetMap (Overpass) indisponível no momento (HTTP ${res.status}). Tente novamente em alguns segundos.`);
  }
  const data = (await res.json()) as { elements?: OverpassElement[] };
  const elements = data.elements ?? [];

  const leads: Lead[] = [];
  const seen = new Set<string>();
  for (const el of elements) {
    const t = el.tags ?? {};
    const name = t.name?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const website = t.website || t["contact:website"] || t.url || null;
    const siteType = classifyWebsite(website);
    const phoneRaw = t["contact:whatsapp"] || t["contact:mobile"] || t["contact:phone"] || t.phone || t.mobile || null;
    const phone = normalizePhone(phoneRaw?.split(";")[0], country.dial);

    let ig: string | null = null;
    const igTag = t["contact:instagram"];
    if (igTag) ig = igTag.startsWith("http") ? instagramHandleFromUrl(igTag) : igTag.replace(/^@/, "");
    if (!ig && siteType === "social") ig = instagramHandleFromUrl(website);

    const addr = [t["addr:street"], t["addr:housenumber"], t["addr:suburb"], t["addr:city"]].filter(Boolean).join(", ");
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;

    leads.push({
      id: `o_${el.type}_${el.id}`,
      name,
      address: addr || opts.city,
      phoneRaw,
      phoneE164: phone?.e164 ?? null,
      whatsapp: phone?.whatsapp ?? null,
      website: siteType === "site" ? website : null,
      siteType,
      instagram: ig,
      instagramUrl: ig ? `https://instagram.com/${ig}` : null,
      instagramConfidence: ig ? "fonte" : null,
      rating: null,
      ratingCount: null,
      mapsUrl: lat && lon ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&center=${lat},${lon}` : null,
      source: "osm",
      city: opts.city,
      niche: opts.niche,
    });
  }

  if (leads.length === 0) {
    warnings.push(`OpenStreetMap não tem estabelecimentos de "${opts.niche}" cadastrados em ${opts.city}. Use o modo Google para resultados completos.`);
  } else {
    warnings.push("Modo gratuito (OpenStreetMap): poucos estabelecimentos têm telefone cadastrado. Ative a busca de Instagram para completar.");
  }

  return { leads, warnings, totalFound: elements.length };
}
