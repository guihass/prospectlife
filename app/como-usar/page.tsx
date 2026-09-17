import Link from "next/link";

export const metadata = {
  title: "Como usar o ProspectLife — guia completo",
};

export default function ComoUsar() {
  return (
    <article className="guide">
      <section className="hero">
        <h1>
          Como usar o <span>ProspectLife</span>
        </h1>
        <p>Guia passo a passo, do zero. Não precisa saber programar. Tudo aqui é gratuito.</p>
      </section>

      <div className="card">
        <h2>O que o ProspectLife faz?</h2>
        <p>
          Ele é um <b>agente de prospecção</b> para quem vende sites, marketing, tráfego, design ou qualquer serviço para empresas locais. Em poucos cliques ele:
        </p>
        <ul>
          <li>
            <b>Encontra empresas</b> de um nicho (ex.: pizzaria, barbearia, dentista) nas cidades que você escolher, em qualquer país.
          </li>
          <li>
            <b>Separa quem não tem site</b> — e também quem só tem Instagram/Facebook/Linktree no lugar de site (esses são os melhores leads).
          </li>
          <li>
            Entrega <b>nome, WhatsApp (link pronto) e Instagram</b> de cada empresa.
          </li>
          <li>
            <b>Audita os sites</b> das empresas que já têm um: aponta inconsistências (sem HTTPS, sem título, “em construção”, rodapé antigo, construtor gratuito…) e
            problemas de <b>visualização no celular</b>, com nota de 0 a 100 e uma frase pronta para você usar na abordagem.
          </li>
          <li>
            <b>Escreve a primeira mensagem</b> de WhatsApp de um jeito humano: curta, calma, sem pressão, terminando com uma pergunta simples.
          </li>
          <li>
            Opcionalmente, <b>envia as mensagens sozinho</b> pelo seu número, com pausas aleatórias e limite diário, para parecer uma pessoa e não um robô.
          </li>
          <li>Exporta tudo em <b>CSV</b> (abre no Excel / Google Sheets).</li>
        </ul>
      </div>

      <div className="card">
        <h2>Passo a passo rápido</h2>
        <ol className="steps">
          <li>
            Na página inicial, escolha o <b>país</b>. Brasil já vem selecionado.
          </li>
          <li>
            Digite as <b>cidades</b> (uma por linha). Escreva “Cidade, Estado” — ex.: <code>Curitiba, PR</code>.
          </li>
          <li>
            Digite os <b>nichos</b> (um por linha) do jeito que as pessoas pesquisam no Google: <code>pizzaria</code>, <code>pet shop</code>, <code>clínica de estética</code>.
          </li>
          <li>
            Escolha a fonte: <b>Modo gratuito</b> (OpenStreetMap, sem chave) ou <b>Modo Google</b> (muito mais completo — precisa de uma chave, gratuita, veja abaixo).
          </li>
          <li>
            Marque <b>Procurar Instagram</b> e, se quiser auditar sites, <b>Incluir empresas que já têm site</b> + <b>Auditar</b>.
          </li>
          <li>
            Clique em <b>Buscar leads</b>. Acompanhe o progresso. Os resultados aparecem na seção 3.
          </li>
          <li>
            Preencha <b>seu nome</b> na seção 2 e clique em <b>Escrever mensagens para todos</b>.
          </li>
          <li>
            Para cada lead, clique em <b>Abrir WhatsApp</b> — a mensagem já vai pronta, é só apertar enviar. Ou conecte seu número e use o <b>envio automático</b>.
          </li>
        </ol>
      </div>

      <div className="card" id="google">
        <h2>Modo Google: como criar sua chave (grátis)</h2>
        <p>
          O Google dá <b>US$ 200 por mês de crédito grátis</b> na Places API — dá para milhares de buscas sem pagar nada. A chave fica salva só no seu navegador; o
          ProspectLife nunca guarda.
        </p>
        <ol className="steps">
          <li>
            Acesse{" "}
            <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer">
              console.cloud.google.com
            </a>{" "}
            e entre com sua conta Google.
          </li>
          <li>
            No topo, clique em <b>Selecionar projeto → Novo projeto</b>. Dê um nome (ex.: “prospectlife”) e crie.
          </li>
          <li>
            O Google vai pedir para <b>ativar o faturamento</b> (cadastrar um cartão). Isso é obrigatório para usar a API, mas você só paga se passar dos US$ 200/mês
            — e dá para colocar um alerta/limite de gasto em <b>Faturamento → Orçamentos e alertas</b>.
          </li>
          <li>
            Vá em <b>APIs e serviços → Biblioteca</b>, procure <b>“Places API (New)”</b> e clique em <b>Ativar</b>.
          </li>
          <li>
            Vá em <b>APIs e serviços → Credenciais → Criar credenciais → Chave de API</b>. Copie a chave (começa com <code>AIza</code>).
          </li>
          <li>
            (Recomendado) Clique na chave, em <b>Restrições de API</b> escolha “Restringir chave” e marque só a <b>Places API (New)</b>. Não coloque restrição de
            site/IP, senão o ProspectLife não consegue usar.
          </li>
          <li>Cole a chave no campo “Sua chave da Google Places API” e pronto.</li>
        </ol>
        <p className="hint">Cada busca de cidade+nicho consome até 3 requisições (60 resultados). Com US$ 200 você faz cerca de 5.000 buscas por mês.</p>
      </div>

      <div className="card">
        <h2>Modo gratuito (OpenStreetMap)</h2>
        <p>
          Não precisa de chave nem cadastro. Usa o mapa colaborativo OpenStreetMap. Funciona bem para achar <b>nomes</b> de empresas, mas poucas têm telefone
          cadastrado lá. Por isso:
        </p>
        <ul>
          <li>Deixe “Procurar Instagram” ligado — muitas vezes o Instagram tem o WhatsApp na bio.</li>
          <li>Em cidades pequenas o resultado pode vir vazio. Tente nichos mais genéricos (“restaurante” em vez de “restaurante japonês”).</li>
          <li>Se quiser volume e telefone de quase todas, use o Modo Google.</li>
        </ul>
      </div>

      <div className="card">
        <h2>Como o WhatsApp é descoberto?</h2>
        <p>
          O telefone vem do cadastro da empresa (Google ou OpenStreetMap). O ProspectLife limpa o número, coloca o código do país (<code>+55</code> para o Brasil, ou
          o DDI do país escolhido) e monta o link <code>wa.me/55DDDNÚMERO</code>. Números 0800/4004 são descartados porque não têm WhatsApp. Telefones fixos podem
          ou não ter WhatsApp Business — o app não consegue saber antes de você mandar mensagem.
        </p>
      </div>

      <div className="card">
        <h2>Como o Instagram é descoberto?</h2>
        <ul>
          <li>
            Se a empresa colocou o Instagram no campo “site” do Google, pega direto (confiança <b>fonte</b>).
          </li>
          <li>
            Senão, o app pesquisa <i>“nome da empresa + cidade + instagram”</i> em buscadores públicos e pega o primeiro perfil. Se o @ parecer com o nome da empresa,
            marca <b>confiança alta</b>; se não, <b>média</b> — confira antes de usar.
          </li>
        </ul>
      </div>

      <div className="card" id="auditoria">
        <h2>Auditoria de site: o que ela verifica</h2>
        <p>
          Quando você marca “Incluir empresas que já têm site”, o ProspectLife abre a página inicial de cada site (como se fosse um celular) e avalia. Cada
          problema vem com uma <b>frase pronta</b> para usar na conversa. Exemplos do que é detectado:
        </p>
        <ul>
          <li>
            <b>Mobile:</b> sem <code>meta viewport</code> (site “espremido” no celular), sem regras responsivas, layout com tabelas fixas, uso de Flash, frames.
          </li>
          <li>
            <b>Segurança:</b> sem HTTPS (aviso “Não seguro” no Chrome), conteúdo misto, bibliotecas antigas.
          </li>
          <li>
            <b>Inconsistências:</b> site fora do ar, erro 404/500, “em construção”, texto Lorem ipsum, rodapé com ano antigo, construtor gratuito com endereço da
            plataforma (Wix, Blogger, negocio.site…).
          </li>
          <li>
            <b>SEO:</b> sem título ou título genérico (“Home”), sem meta description, sem H1, imagens sem descrição, sem prévia de compartilhamento (Open Graph).
          </li>
          <li>
            <b>Conversão:</b> sem botão de WhatsApp, telefone escondido, sem links para redes sociais.
          </li>
          <li>
            <b>Performance:</b> HTML muito pesado, servidor lento.
          </li>
        </ul>
        <p className="hint">
          A nota vai de 0 a 100 (quanto menor, pior o site — e melhor o lead). A análise é feita só com o HTML da página inicial, então é um diagnóstico rápido,
          não uma auditoria completa. Use como gancho de conversa e confirme abrindo o site no seu celular.
        </p>
      </div>

      <div className="card" id="ia">
        <h2>As mensagens: por que são curtas e calmas?</h2>
        <p>
          Ninguém gosta de receber um textão de vendas de um desconhecido. A primeira mensagem do ProspectLife só <b>abre a conversa</b>: cumprimenta, diz quem
          é, cita algo verdadeiro da empresa e termina com uma pergunta fácil. Exemplo:
        </p>
        <div className="msg-box">
          Boa tarde! Tudo bem? 😊 Aqui é Guilherme. Vi a Pizzaria do Zé no Google e achei o trabalho de vocês bem bacana. Posso te fazer uma pergunta rápida?
        </div>
        <p className="mt">
          Quando a pessoa responde, aí sim você explica o que faz (o app sugere uma 2ª mensagem em “Ver auditoria” ou no CSV). Você pode editar qualquer texto
          antes de enviar.
        </p>
        <h3>IA opcional (Anthropic)</h3>
        <p>
          Sem chave nenhuma, o app já usa modelos humanizados com variações aleatórias. Se você quiser que cada mensagem seja <b>única e personalizada</b>, crie uma
          chave em{" "}
          <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer">
            console.anthropic.com
          </a>{" "}
          (API Keys → Create Key) e cole no campo da seção 2. Cada mensagem custa fração de centavo. A chave fica só no seu navegador.
        </p>
      </div>

      <div className="card" id="envio">
        <h2>Envio automático pelo seu número</h2>
        <p>
          O jeito mais simples e seguro é o <b>semi-automático</b>: clicar em “Abrir WhatsApp” em cada lead — a mensagem já vai pronta. Se você quer que o agente
          envie sozinho, precisa conectar seu número por um destes caminhos:
        </p>
        <h3>Opção A — Evolution API (seu número normal, grátis)</h3>
        <p>
          A Evolution API é um programa open-source que “lê” o QR Code do seu WhatsApp (igual ao WhatsApp Web) e permite enviar mensagens por comando. Ela precisa
          rodar num servidor seu 24h — uma VPS barata (Hostinger, Contabo, Oracle Cloud grátis) com Docker resolve.
        </p>
        <ol className="steps">
          <li>
            Instale seguindo a documentação oficial:{" "}
            <a href="https://doc.evolution-api.com/" target="_blank" rel="noreferrer">
              doc.evolution-api.com
            </a>{" "}
            (há vídeos no YouTube: pesquise “instalar Evolution API docker”).
          </li>
          <li>
            Crie uma instância (ex.: <code>prospectlife</code>) e leia o QR Code com o WhatsApp do número que vai enviar.
          </li>
          <li>
            No ProspectLife, seção 2 → “Conectar meu número” → Evolution API. Preencha a URL (ex.: <code>https://evo.seudominio.com</code>), a <code>apikey</code>{" "}
            global e o nome da instância.
          </li>
          <li>Clique em “Enviar teste para mim” para confirmar.</li>
        </ol>
        <div className="alert alert-warn">
          Atenção: enviar muitas mensagens para desconhecidos com um número comum pode gerar <b>bloqueio pelo WhatsApp</b>. Use um número dedicado (chip novo,
          preferencialmente WhatsApp Business), comece com 20–30 mensagens por dia, mantenha as pausas longas e responda quem te responder. O ProspectLife já
          coloca pausas aleatórias e limite diário, mas a responsabilidade é sua.
        </div>
        <h3>Opção B — WhatsApp Cloud API (Meta, oficial)</h3>
        <p>
          É o caminho oficial da Meta: 1.000 conversas por mês grátis e sem risco de banimento. A diferença: para <b>iniciar</b> conversa com quem nunca te escreveu,
          a Meta exige que a mensagem seja um <b>template aprovado</b>. Ou seja, você cadastra um texto (com <code>{"{{1}}"}</code> no lugar do nome da empresa),
          a Meta aprova em algumas horas, e o ProspectLife envia esse template.
        </p>
        <ol className="steps">
          <li>
            Crie um app em{" "}
            <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer">
              developers.facebook.com
            </a>{" "}
            → tipo “Business” → adicione o produto <b>WhatsApp</b>.
          </li>
          <li>
            Em WhatsApp → Configuração da API, adicione seu número e pegue o <b>Phone Number ID</b>. Gere um <b>token permanente</b> (System User no Business
            Manager).
          </li>
          <li>
            Em WhatsApp Manager → Modelos de mensagem, crie um template categoria <b>Marketing</b>, idioma <b>pt_BR</b>, com um texto curto e humano, por exemplo:{" "}
            <i>“Olá! Aqui é o Guilherme. Vi a {"{{1}}"} no Google e queria te fazer uma pergunta rápida, pode ser?”</i>
          </li>
          <li>No ProspectLife, escolha “WhatsApp Cloud API” e preencha token, Phone Number ID e o nome do template.</li>
        </ol>
      </div>

      <div className="card">
        <h2>Boas práticas e responsabilidade</h2>
        <ul>
          <li>
            <b>Converse como gente.</b> Mensagem curta, responder rápido, sem insistir. Se a pessoa disser que não quer, agradeça e não mande mais.
          </li>
          <li>
            <b>LGPD:</b> os dados vêm de cadastros públicos (Google/OSM) e são usados para contato comercial B2B. Não venda listas, não colete além do necessário e
            respeite pedidos de exclusão.
          </li>
          <li>
            <b>WhatsApp:</b> spam pode bloquear seu número. Volume baixo, pausas longas, número dedicado.
          </li>
          <li>
            <b>Confira antes de mandar:</b> Instagram com “confiança média” pode ser de outra empresa com nome parecido.
          </li>
        </ul>
      </div>

      <div className="card">
        <h2>Perguntas frequentes</h2>
        <h3>É grátis mesmo?</h3>
        <p>Sim. O ProspectLife é gratuito e de código aberto. Os únicos custos possíveis são de terceiros, se você optar: Google (grátis até US$ 200/mês), Anthropic (centavos) e um servidor para a Evolution API.</p>
        <h3>Meus dados ficam salvos onde?</h3>
        <p>Só no seu navegador (localStorage). Chaves, leads e mensagens nunca são gravados no servidor do ProspectLife. Se limpar o navegador, some.</p>
        <h3>Posso usar em outro país?</h3>
        <p>Sim. Escolha o país na lista; o app pesquisa no idioma local e monta os números de WhatsApp com o DDI correto.</p>
        <h3>A busca travou / deu erro</h3>
        <p>
          Modo gratuito: o OpenStreetMap às vezes fica lento — espere 30s e tente de novo. Modo Google: veja se a “Places API (New)” está ativada e se a chave não tem
          restrição de site/IP.
        </p>
        <h3>Quero rodar minha própria cópia</h3>
        <p>
          O código está no{" "}
          <a href="https://github.com/guihass/prospectlife" target="_blank" rel="noreferrer">
            GitHub
          </a>
          . Clique em “Deploy to Vercel” no README ou rode <code>npm install && npm run dev</code>. Você pode definir <code>GOOGLE_PLACES_API_KEY</code> e{" "}
          <code>ANTHROPIC_API_KEY</code> como variáveis de ambiente para não precisar digitar as chaves.
        </p>
      </div>

      <p className="mt">
        <Link href="/" className="btn btn-primary">
          ← Voltar e buscar leads
        </Link>
      </p>
    </article>
  );
}
