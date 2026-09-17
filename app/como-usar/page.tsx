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
            Organiza a conversa num <b>funil de vendas</b> com etapas e textos escritos por você (com sugestões prontas), preenchendo nome da empresa, cidade e nicho automaticamente.
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
            Na seção 2, preencha <b>seu nome</b> e edite os textos do <b>funil de vendas</b> (ou use as sugestões).
          </li>
          <li>
            Para cada lead, clique em <b>Abrir WhatsApp</b> — o texto da etapa atual já vai preenchido, é só revisar e enviar. Conforme a conversa avança, clique em <b>Próxima etapa</b>.
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

      <div className="card" id="verificar">
        <h2>Verificar se o número tem WhatsApp</h2>
        <p>
          <b>Não existe consulta pública do WhatsApp.</b> A Meta não oferece um jeito gratuito de perguntar “esse número tem conta?”. A única forma confiável é
          perguntar ao próprio WhatsApp usando <b>um número seu conectado</b>. O ProspectLife suporta dois caminhos:
        </p>
        <h3>Sem configurar nada (pista gratuita)</h3>
        <p>
          O app classifica cada telefone como <b>celular</b> ou <b>fixo</b>. No Brasil, celular (9 dígitos começando com 9) quase sempre tem WhatsApp; fixo só tem se
          a empresa usa WhatsApp Business. Use o filtro <b>“Só celulares”</b> na lista de leads para priorizar.
        </p>
        <h3>Opção A — Evolution API (grátis, servidor seu)</h3>
        <p>
          A Evolution API é um programa open-source que “lê” o QR Code do seu WhatsApp (igual ao WhatsApp Web) e permite consultar, por comando, se números
          existem no WhatsApp — 50 de uma vez. Precisa rodar num servidor seu 24h: uma VPS barata (Hostinger, Contabo, Oracle Cloud grátis) com Docker resolve.
        </p>
        <ol className="steps">
          <li>
            Instale seguindo a documentação oficial:{" "}
            <a href="https://doc.evolution-api.com/" target="_blank" rel="noreferrer">
              doc.evolution-api.com
            </a>{" "}
            (no YouTube, pesquise “instalar Evolution API docker”).
          </li>
          <li>
            Crie uma instância (ex.: <code>prospectlife</code>) e leia o QR Code com o WhatsApp do número que vai usar. Recomendo um <b>chip dedicado</b>, não o seu
            pessoal.
          </li>
          <li>
            No ProspectLife, marque <b>“Verificar se o número tem WhatsApp”</b> → <b>Configurar</b> → Evolution API. Preencha a URL (ex.:{" "}
            <code>https://evo.seudominio.com</code>), a <code>apikey</code> global e o nome da instância.
          </li>
          <li>Digite seu número e clique em <b>Testar conexão</b>. Se aparecer “Conexão OK”, está pronto.</li>
        </ol>
        <h3>Opção B — Z-API (pago, sem servidor)</h3>
        <p>
          Serviço brasileiro: você cria conta em{" "}
          <a href="https://z-api.io/" target="_blank" rel="noreferrer">
            z-api.io
          </a>
          , conecta o WhatsApp pelo QR Code no painel deles e pronto — não precisa de servidor. Custa a partir de ~R$100/mês.
        </p>
        <ol className="steps">
          <li>No painel da Z-API, copie o <b>ID da instância</b>, o <b>Token</b> e, em Segurança, o <b>Client-Token</b> da conta.</li>
          <li>No ProspectLife, escolha Z-API, cole os três e clique em <b>Testar conexão</b>.</li>
        </ol>
        <h3>Como funciona depois de configurado</h3>
        <ul>
          <li>Com a opção marcada, toda busca verifica os números automaticamente antes de mostrar.</li>
          <li>Leads já na lista: clique em <b>Verificar agora</b> no aviso da seção 3.</li>
          <li>
            Números <b>confirmados</b> ganham o selo “WhatsApp ✓”. Números <b>sem WhatsApp</b> aparecem riscados e perdem o botão “Abrir WhatsApp” — use o filtro
            “Só WhatsApp confirmado” para ver só os bons.
          </li>
          <li>A verificação não envia nada para a empresa — é uma consulta silenciosa.</li>
        </ul>
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

      <div className="card" id="funil">
        <h2>O funil de vendas: você escreve, o app preenche</h2>
        <p>
          Na seção 2 da página inicial você monta o seu <b>funil</b>: uma sequência de etapas (Abertura, Conexão, Apresentação, Proposta, Follow-up…) e o
          texto que você manda em cada uma. O ProspectLife já vem com textos sugeridos — curtos, calmos e sem pressão — mas a ideia é que você escreva
          do seu jeito.
        </p>
        <h3>Como funciona no dia a dia</h3>
        <ol className="steps">
          <li>Preencha <b>seu nome</b> e, se quiser, <b>sua empresa</b> — eles entram nos textos.</li>
          <li>Clique em <b>Editar textos do funil</b> e escreva a mensagem de cada etapa. Pode criar, renomear, reordenar e remover etapas.</li>
          <li>
            Use variáveis entre chaves para personalizar automaticamente: <code>{"{empresa}"}</code>, <code>{"{cidade}"}</code>, <code>{"{nicho}"}</code>,{" "}
            <code>{"{meu_nome}"}</code>, <code>{"{minha_empresa}"}</code>, <code>{"{saudacao}"}</code> (Bom dia/tarde/noite), <code>{"{problema_site}"}</code> e{" "}
            <code>{"{nota_site}"}</code> (para quem tem site auditado).
          </li>
          <li>
            Todo lead novo começa na primeira etapa. Clique em <b>Abrir WhatsApp</b>: o WhatsApp abre com o texto daquela etapa já preenchido — você lê, ajusta se
            quiser e aperta enviar.
          </li>
          <li>
            Quando a pessoa responder e a conversa evoluir, clique em <b>Próxima etapa</b> (ou escolha a etapa no menu). O próximo “Abrir WhatsApp” já usa o
            texto da etapa nova.
          </li>
          <li>
            Marque o lead como <b>Fechado</b> ou <b>Perdido</b>, escreva <b>anotações</b> em “Detalhes” e use os contadores do funil para ver quantos leads
            estão em cada etapa. Clique num contador para filtrar.
          </li>
        </ol>
        <h3>Outros países: mensagens no idioma deles</h3>
        <p>
          O funil é <b>por idioma</b>. Quando você escolhe um país, o app usa o funil daquele idioma — já vêm sugestões em <b>português, espanhol, inglês,
          francês, italiano e alemão</b>, e a saudação ({"{saudacao}"}) é traduzida em mais de 20 idiomas. Cada lead guarda o país/idioma de onde veio, então
          uma lista misturada (Brasil + Argentina + EUA) manda cada um no idioma certo. Para editar outro idioma, use o seletor <b>“Idioma”</b> ao lado de “Editar
          textos do funil”. Para idiomas sem sugestão (japonês, árabe…), o app mostra o funil em inglês para você traduzir.
        </p>
        <h3>Dica de texto</h3>
        <div className="msg-box">
          Boa tarde! Tudo bem? 😊 Aqui é Guilherme. Vi a Pizzaria do Zé no Google e achei o trabalho de vocês bem bacana. Posso te fazer uma pergunta rápida?
        </div>
        <p className="mt">
          Primeira mensagem curta, humana, terminando com uma pergunta fácil. Ninguém responde textão de vendas de desconhecido. O “pitch” só vem na 3ª ou 4ª
          etapa, depois que a pessoa já respondeu.
        </p>
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
            <b>WhatsApp:</b> mandar mensagem demais para desconhecidos pode bloquear seu número. Volume baixo e conversa de verdade.
          </li>
          <li>
            <b>Confira antes de mandar:</b> Instagram com “confiança média” pode ser de outra empresa com nome parecido.
          </li>
        </ul>
      </div>

      <div className="card">
        <h2>Perguntas frequentes</h2>
        <h3>É grátis mesmo?</h3>
        <p>Sim. O ProspectLife é gratuito e de código aberto. O único custo possível é do Google, se você optar pelo modo Google — e ele dá US$ 200/mês grátis.</p>
        <h3>Meus dados ficam salvos onde?</h3>
        <p>Só no seu navegador (localStorage). Chave, leads, funil e anotações nunca são gravados no servidor do ProspectLife. Se limpar o navegador, some — exporte o CSV de vez em quando.</p>
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
          . Clique em “Deploy to Vercel” no README ou rode <code>npm install && npm run dev</code>. Você pode definir <code>GOOGLE_PLACES_API_KEY</code> como variável de ambiente para não precisar digitar a chave.
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
