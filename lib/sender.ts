/**
 * Envio automático de WhatsApp a partir do número do usuário.
 * Dois provedores suportados (o usuário configura um deles na tela):
 *
 *  1. WhatsApp Cloud API (Meta, oficial)  — precisa de token + Phone Number ID.
 *     Para iniciar conversa com quem nunca te escreveu, a Meta exige um
 *     "template" aprovado. Por isso aceitamos templateName/templateLang.
 *
 *  2. Evolution API (open-source, roda no seu servidor) — usa seu número normal
 *     lido por QR Code. Envia texto livre. Precisa de URL + apikey + instância.
 */

export type SenderProvider = "cloud" | "evolution";

export interface SenderConfig {
  provider: SenderProvider;
  // Cloud API
  cloudToken?: string;
  cloudPhoneNumberId?: string;
  cloudTemplateName?: string;
  cloudTemplateLang?: string;
  // Evolution
  evoBaseUrl?: string;
  evoApiKey?: string;
  evoInstance?: string;
}

export interface SendResult {
  ok: boolean;
  provider: SenderProvider;
  messageId?: string;
  error?: string;
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("Tempo esgotado ao falar com o provedor")), ms)),
  ]);
}

export async function sendWhatsApp(cfg: SenderConfig, toDigits: string, text: string, templateParams?: string[]): Promise<SendResult> {
  const to = toDigits.replace(/\D/g, "");
  if (!to) return { ok: false, provider: cfg.provider, error: "Número inválido" };

  if (cfg.provider === "cloud") {
    if (!cfg.cloudToken || !cfg.cloudPhoneNumberId) {
      return { ok: false, provider: "cloud", error: "Configure o token e o Phone Number ID da Cloud API." };
    }
    const url = `https://graph.facebook.com/v21.0/${cfg.cloudPhoneNumberId}/messages`;
    const body: Record<string, unknown> = cfg.cloudTemplateName
      ? {
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: cfg.cloudTemplateName,
            language: { code: cfg.cloudTemplateLang || "pt_BR" },
            components: templateParams?.length
              ? [{ type: "body", parameters: templateParams.map((t) => ({ type: "text", text: t })) }]
              : [],
          },
        }
      : { messaging_product: "whatsapp", to, type: "text", text: { preview_url: false, body: text } };

    try {
      const res = await withTimeout(
        fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${cfg.cloudToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
        15000
      );
      const data = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string } };
      if (!res.ok) return { ok: false, provider: "cloud", error: data.error?.message || `HTTP ${res.status}` };
      return { ok: true, provider: "cloud", messageId: data.messages?.[0]?.id };
    } catch (e) {
      return { ok: false, provider: "cloud", error: e instanceof Error ? e.message : "Erro" };
    }
  }

  // Evolution API
  if (!cfg.evoBaseUrl || !cfg.evoApiKey || !cfg.evoInstance) {
    return { ok: false, provider: "evolution", error: "Configure URL, apikey e instância da Evolution API." };
  }
  const base = cfg.evoBaseUrl.replace(/\/+$/, "");
  const url = `${base}/message/sendText/${encodeURIComponent(cfg.evoInstance)}`;
  const body = {
    number: to,
    text,                       // formato v2
    textMessage: { text },      // formato v1 (ignorado pela v2)
    options: { delay: 1500, presence: "composing", linkPreview: false },
  };
  try {
    const res = await withTimeout(
      fetch(url, {
        method: "POST",
        headers: { apikey: cfg.evoApiKey, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      20000
    );
    const data = (await res.json().catch(() => ({}))) as { key?: { id?: string }; message?: string; error?: string; response?: { message?: unknown } };
    if (!res.ok) {
      const msg = data.message || data.error || JSON.stringify(data.response?.message ?? "") || `HTTP ${res.status}`;
      return { ok: false, provider: "evolution", error: String(msg) };
    }
    return { ok: true, provider: "evolution", messageId: data.key?.id };
  } catch (e) {
    return { ok: false, provider: "evolution", error: e instanceof Error ? e.message : "Erro" };
  }
}
