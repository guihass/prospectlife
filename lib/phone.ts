/**
 * Converte um telefone em qualquer formato para o formato internacional
 * usado pelo WhatsApp (só dígitos, com código do país, sem "+").
 *
 * Exemplos (Brasil, dial = "55"):
 *  "(41) 99999-9999"      -> 5541999999999
 *  "+55 41 3333-4444"     -> 554133334444
 *  "0800 123 4567"        -> null  (0800 não tem WhatsApp)
 */
export interface PhoneResult {
  e164: string;     // +5541999999999
  digits: string;   // 5541999999999
  whatsapp: string; // https://wa.me/5541999999999
}

export function normalizePhone(raw: string | null | undefined, dial: string): PhoneResult | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  const isInternational = trimmed.startsWith("+") || digits.startsWith("00");
  if (digits.startsWith("00")) digits = digits.slice(2);

  if (!isInternational) {
    if (dial === "55") {
      // Brasil: números nacionais têm 10 (fixo) ou 11 (celular) dígitos com DDD
      if (digits.startsWith("0") && digits.length > 11) digits = digits.replace(/^0+/, "");
      if (/^(0800|0300|4004|3003|0500)/.test(digits)) return null; // linhas sem WhatsApp
      if (digits.length === 10 || digits.length === 11) digits = dial + digits;
      else if (digits.length === 12 || digits.length === 13) {
        if (!digits.startsWith("55")) return null;
      } else return null;
    } else {
      // Outros países: remove o "0" de tronco e adiciona o código do país
      digits = digits.replace(/^0+/, "");
      if (!digits.startsWith(dial)) digits = dial + digits;
    }
  }

  if (digits.length < 8 || digits.length > 15) return null;

  return {
    e164: "+" + digits,
    digits,
    whatsapp: "https://wa.me/" + digits,
  };
}

/** Formata para exibição amigável */
export function prettyPhone(e164: string | null): string {
  if (!e164) return "";
  const d = e164.replace(/\D/g, "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) {
    const ddd = d.slice(2, 4);
    const rest = d.slice(4);
    if (rest.length === 9) return `+55 (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
    return `+55 (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  return e164;
}
