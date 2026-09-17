# ProspectLife 🟢

**IA gratuita de prospecção**: encontra empresas **sem site** nas cidades e nichos que você escolher (Brasil ou qualquer país), entrega **nome, WhatsApp e Instagram**, audita sites fracos (inconsistências + problemas no celular) e escreve a **primeira mensagem** de forma curta, calma e humana — podendo enviar automaticamente pelo seu número.

Feito para ser usado por qualquer pessoa, de graça: agências, freelancers, vendedores de sites, tráfego, design, etc.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/guihass/prospectlife)

---

## O que ele faz

| Recurso | Como funciona |
|---|---|
| 🔍 **Busca por cidade + nicho** | Várias cidades e nichos de uma vez. País selecionável (Brasil padrão + 60 países). |
| 🚫 **Filtra quem não tem site** | Inclui quem só tem Instagram/Facebook/Linktree no lugar de site (melhores leads). |
| 💬 **WhatsApp pronto** | Normaliza o telefone com o DDI do país e gera o link `wa.me`. |
| 📸 **Instagram** | Pega do cadastro ou pesquisa em buscadores públicos, com nível de confiança. |
| 🔎 **Auditoria de site** | Para quem já tem site: HTTPS, viewport/mobile, título, description, "em construção", rodapé antigo, construtor gratuito, botão de WhatsApp, performance… Nota 0–100 + frase pronta para cada problema. |
| ✍️ **Mensagem humana** | Abertura curta e calma, com variações. Opcional: Claude (Anthropic) escreve uma mensagem única por empresa. |
| 🤖 **Envio automático** | Via Evolution API (seu número por QR Code) ou WhatsApp Cloud API (Meta). Pausas aleatórias + limite diário. |
| ⬇ **Exporta CSV** | Abre no Excel / Google Sheets. |

Guia completo dentro do app: **/como-usar**.

## Fontes de dados

- **Modo gratuito**: OpenStreetMap (Nominatim + Overpass). Sem chave. Poucos telefones.
- **Modo Google** (recomendado): Google Places API (New) com a **sua** chave — o Google dá US$ 200/mês grátis (~5.000 buscas). A chave fica só no navegador do usuário.

## Rodando localmente

```bash
git clone https://github.com/guihass/prospectlife
cd prospectlife
npm install
npm run dev
```

Abra http://localhost:3000.

### Variáveis de ambiente (opcionais)

Se você hospedar sua própria cópia e não quiser que os usuários digitem chaves:

| Variável | Para quê |
|---|---|
| `GOOGLE_PLACES_API_KEY` | Chave da Places API (New) usada quando o usuário não informa a dele. |
| `ANTHROPIC_API_KEY` | Chave da Anthropic para a IA escrever mensagens. |

## Estrutura

```
app/
  page.tsx            # tela principal (busca, mensagens, envio)
  como-usar/page.tsx  # guia passo a passo
  api/search          # busca de empresas (Google ou OSM)
  api/instagram       # descoberta de Instagram
  api/audit           # auditoria de site
  api/message         # geração da mensagem (modelo ou IA)
  api/send            # envio de WhatsApp (Evolution / Cloud API)
lib/
  google.ts  osm.ts  phone.ts  social.ts  instagram.ts
  audit.ts   messages.ts  ai.ts  sender.ts  countries.ts  types.ts
```

## Privacidade e responsabilidade

- Nada é gravado no servidor: chaves, leads e mensagens ficam no `localStorage` do navegador do usuário.
- Os dados de empresas vêm de cadastros públicos (Google / OpenStreetMap). Use para contato comercial B2B, respeite a LGPD e pedidos de exclusão.
- Envio em massa pode bloquear seu número no WhatsApp. Use número dedicado, volume baixo e pausas longas. A responsabilidade pelo uso é sua.

## Licença

MIT — use, copie, melhore.
