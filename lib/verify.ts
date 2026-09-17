/**
 * Verificação real de WhatsApp: pergunta ao WhatsApp (pelo número conectado do usuário)
 * se cada telefone tem conta. Dois provedores:
 *
 *  - Evolution API (grátis, open-source, servidor próprio): POST /chat/whatsappNumbers/{instance}
 *  - Z-API (serviço pago brasileiro, sem servidor):        GET  /phone-exists/{phone}
 *
 * As credenciais ficam só no navegador do usuário e são enviadas por requisição.
 */

export type VerifyProvider = "evolution" | "zapi";

export interface VerifyConfig {
  provider: VerifyProvider;
  evoBaseUrl?: string;
  evoApiKey?: string;
  evoInstance?: string;
  zapiInstanceId?: string;
  zapiToken?: string;
  zapiClientToken?: string;
}

export interface VerifyResult {
  number: string;   // só dígitos
  exists: boolean;
}

function timeoutSignal(ms: number): AbortSignal {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

export function verifyReady(cfg: VerifyConfig): boolean {
  return cfg.provider === "evolution"
    ? !!(cfg.evoBaseUrl && cfg.evoApiKey && cfg.evoInstance)
    : !!(cfg.zapiInstanceId && cfg.zapiToken);
}

export async function verifyNumbers(cfg: VerifyConfig, numbers: string[]): Promise<{ results: VerifyResult[]; error?: string }> {
  const clean = Array.from(new Set(numbers.map((n) => n.replace(/\D/g, "")).filter(Boolean)));
  if (!clean.length) return { results: [] };

  if (cfg.provider === "evolution") {
    if (!verifyReady(cfg)) return { results: [], error: "Configure URL, apikey e instância da Evolution API." };
    const base = cfg.evoBaseUrl!.replace(/\/+$/, "");
    try {
      const res = await fetch(`${base}/chat/whatsappNumbers/${encodeURIComponent(cfg.evoInstance!)}`, {
        method: "POST",
        headers: { apikey: cfg.evoApiKey!, "Content-Type": "application/json" },
        body: JSON.stringify({ numbers: clean }),
        signal: timeoutSignal(25000),
      });
      const data = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) {
        const msg = (data as { message?: string; error?: string; response?: { message?: unknown } } | null);
        return { results: [], error: String(msg?.message || msg?.error || JSON.stringify(msg?.response?.message ?? "") || `HTTP ${res.status}`) };
      }
      // Formato: [{ exists: true, jid: "5541...@s.whatsapp.net", number: "5541..." }]
      const arr = Array.isArray(data) ? (data as { exists?: boolean; number?: string; jid?: string }[]) : [];
      const results: VerifyResult[] = arr.map((r) => ({
        number: (r.number || r.jid || "").replace(/\D/g, "").replace(/^(\d+)$/, "$1"),
        exists: !!r.exists,
      }));
      // Evolution pode devolver o número "corrigido" (ex.: sem o 9). Casa pelo sufixo.
      const normalized = clean.map((n) => {
        const hit = results.find((r) => r.number === n) ?? results.find((r) => n.endsWith(r.number.slice(-8)) || r.number.endsWith(n.slice(-8)));
        return { number: n, exists: hit ? hit.exists : false };
      });
      return { results: normalized };
    } catch (e) {
      return { results: [], error: e instanceof Error ? e.message : "Falha ao falar com a Evolution API" };
    }
  }

  // Z-API: um número por requisição
  if (!verifyReady(cfg)) return { results: [], error: "Configure Instance ID e Token da Z-API." };
  const results: VerifyResult[] = [];
  let error: string | undefined;
  for (const n of clean) {
    try {
      const res = await fetch(`https://api.z-api.io/instances/${cfg.zapiInstanceId}/token/${cfg.zapiToken}/phone-exists/${n}`, {
        headers: cfg.zapiClientToken ? { "Client-Token": cfg.zapiClientToken } : {},
        signal: timeoutSignal(15000),
      });
      const data = (await res.json().catch(() => ({}))) as { exists?: boolean; error?: string; message?: string };
      if (!res.ok) {
        error = data.error || data.message || `HTTP ${res.status}`;
        break;
      }
      results.push({ number: n, exists: !!data.exists });
    } catch (e) {
      error = e instanceof Error ? e.message : "Falha ao falar com a Z-API";
      break;
    }
  }
  return { results, error };
}
