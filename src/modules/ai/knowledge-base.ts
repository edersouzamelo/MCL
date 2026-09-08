import type { Citation, MclToolEnvelope } from "@/modules/ai/contracts";

type KnowledgeChunk = {
  id: string;
  title: string;
  text: string;
  source: string;
  url: string;
  keywords: string[];
};

const REPOSITORY_URL = "https://github.com/edersouzamelo/MCL";
const KNOWLEDGE_VERSION = "assistente-rag-v1-2026-09-07";

const KNOWLEDGE_CHUNKS: KnowledgeChunk[] = [
  {
    id: "mcl-overview",
    title: "Finalidade e arquitetura do MCL",
    text:
      "O Modelo de Continuidade Logística (MCL) organiza necessidades, itens e variantes, cobertura por estoque ou aquisição, instrumentos de aquisição, eventos logísticos, rastreabilidade, divergências, conectores, auditoria e visualizações de comando. O App Router expõe módulos separados; a camada cognitiva é apenas explicativa e de consulta, nunca a fonte oficial de registro.",
    source: "README.md e prisma/schema.prisma",
    url: `${REPOSITORY_URL}/tree/main`,
    keywords: ["mcl", "sistema", "arquitetura", "modulos", "finalidade", "explicar", "como funciona"],
  },
  {
    id: "cognitive-guardrails",
    title: "Limites da camada cognitiva",
    text:
      "A camada cognitiva do MCL deve usar somente dados autorizados, declarar fontes, premissas e lacunas, e não pode inventar dados ou pesos, alterar registros oficiais nem decidir pelo usuário. Ferramentas do Assistente são somente leitura e cada resposta deve diferenciar conhecimento versionado, dado persistido, cálculo e fonte oficial consultada ao vivo.",
    source: "docs/COGNITIVE_LAYER.md",
    url: `${REPOSITORY_URL}/blob/main/docs/COGNITIVE_LAYER.md`,
    keywords: ["ia", "rag", "cognitiva", "seguranca", "limites", "fonte", "inventar", "decidir", "leitura"],
  },
  {
    id: "needs-coverage",
    title: "Necessidades e cobertura",
    text:
      "Necessidades registram organização, item/variante, quantidades solicitada e aprovada, prioridade, finalidade, situação, natureza do dado e proveniência. A jornada de cobertura associa análise, mapeamento CATMAT confirmado, candidatos de instrumentos e quantidades cobertas. Quando DATABASE_URL existe, esses objetos podem ser persistidos no PostgreSQL; diversas rotas ainda possuem fallback demonstrativo quando não há banco.",
    source: "prisma/schema.prisma e src/modules/coverage/service.ts",
    url: `${REPOSITORY_URL}/blob/main/src/modules/coverage/service.ts`,
    keywords: ["necessidade", "necessidades", "cobertura", "deficit", "estoque", "analise", "material", "prioridade"],
  },
  {
    id: "catmat-arp",
    title: "CATMAT e Atas de Registro de Preços",
    text:
      "O MCL consulta o CATMAT do Compras.gov.br sob demanda, guarda candidatos e exige confirmação humana do mapeamento antes da busca de Atas de Registro de Preços. Consultas de ARP registram parâmetros, situação, fonte e datas. O CATSER está previsto, mas não está implementado. Uma falha ou resultado vazio da fonte oficial não autoriza fabricar códigos, atas, unidades ou saldos.",
    source: "src/modules/coverage/official-catalog.ts e service.ts",
    url: `${REPOSITORY_URL}/blob/main/src/modules/coverage/official-catalog.ts`,
    keywords: ["catmat", "catser", "ata", "arp", "compras", "catalogo", "mapeamento", "saldo", "adesao"],
  },
  {
    id: "traceability",
    title: "Eventos e rastreabilidade",
    text:
      "O núcleo de rastreabilidade representa unidades logísticas, lotes, locais, remessas, eventos, relações e divergências. QR codes resolvem tokens de unidades. A proveniência inclui sistema e registro de origem, natureza do dado, confiança e datas. Alguns fluxos atuais ainda operam no DemoState em memória; registros com origem SIM ou objetos marcados como sintéticos não podem ser apresentados como situação operacional.",
    source: "prisma/schema.prisma e src/server/demo-store.ts",
    url: `${REPOSITORY_URL}/blob/main/prisma/schema.prisma`,
    keywords: ["qr", "scanner", "evento", "rastreabilidade", "lote", "remessa", "divergencia", "unidade logistica"],
  },
  {
    id: "command-center",
    title: "Centro de Comando do Grupamento",
    text:
      "O módulo /grupamento recebe manualmente o par de relatórios SAG do exercício corrente e RPNP, além da matriz de regras Classes/PI, e calcula quadros para monitores. No estado atual, o resultado validado fica no armazenamento local do navegador; não há snapshot server-side que o Assistente possa consultar. Por isso, o Assistente deve declarar esse silo indisponível até a persistência autenticada ser implementada.",
    source: "src/app/api/grupamento e src/components/GrupamentoStorageBridge.tsx",
    url: `${REPOSITORY_URL}/blob/main/src/components/GrupamentoStorageBridge.tsx`,
    keywords: ["grupamento", "escalão", "sag", "rpnp", "monitor", "cco", "classe", "pi", "powerbi"],
  },
  {
    id: "financial-silo",
    title: "Estado de confiança do módulo financeiro",
    text:
      "Créditos e Grupamento consomem o mesmo snapshot SAG persistido por organização. Cada carga registra tipo de fonte, nome do arquivo, checksum, quantidade de linhas, horário e método de ingestão. Na ausência de carga validada, Painel e Assistente devem declarar indisponibilidade e não usar fallback demonstrativo.",
    source: "src/modules/financial-snapshots/repository.ts",
    url: `${REPOSITORY_URL}/blob/main/src/modules/financial-snapshots/repository.ts`,
    keywords: ["credito", "creditos", "financeiro", "siafi", "tesouro", "empenho", "orcamento", "execucao"],
  },
  {
    id: "ai-runtime",
    title: "Runtime do Assistente IA",
    text:
      "O Assistente usa o Vercel AI Gateway por identidade OIDC do projeto, sem chave permanente no repositório ou nas variáveis do deploy. O modelo padrão é configurável e as ferramentas permanecem independentes do provedor. Uma troca futura para a API direta da OpenAI deve alterar somente o adaptador do modelo e a credencial, preservando RAG, RBAC e ferramentas.",
    source: "src/modules/ai/provider.ts e src/modules/ai/agent.ts",
    url: `${REPOSITORY_URL}/tree/main/src/modules/ai`,
    keywords: ["gateway", "oidc", "openai", "modelo", "api", "assistente", "provedor", "chave", "custo"],
  },
];

const STOP_WORDS = new Set([
  "a", "as", "ao", "aos", "com", "como", "da", "das", "de", "do", "dos", "e", "em", "eu",
  "me", "meu", "na", "nas", "no", "nos", "o", "os", "ou", "para", "por", "qual", "que", "se",
  "sem", "sobre", "um", "uma",
]);

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function tokens(value: string) {
  return new Set(
    normalize(value)
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((token) => token.length >= 2 && !STOP_WORDS.has(token)),
  );
}

function scoreChunk(queryTokens: Set<string>, chunk: KnowledgeChunk) {
  const titleTokens = tokens(`${chunk.title} ${chunk.keywords.join(" ")}`);
  const bodyTokens = tokens(chunk.text);
  let score = 0;
  for (const token of queryTokens) {
    if (titleTokens.has(token)) score += 3;
    if (bodyTokens.has(token)) score += 1;
  }
  return score;
}

export function retrieveMclKnowledge(query: string, requestedLimit = 4): MclToolEnvelope<{
  chunks: Array<Pick<KnowledgeChunk, "id" | "title" | "text" | "source" | "url">>;
  knowledgeVersion: string;
}> {
  const queryTokens = tokens(query);
  const limit = Math.min(Math.max(requestedLimit, 1), 6);
  const ranked = KNOWLEDGE_CHUNKS
    .map((chunk) => ({ chunk, score: scoreChunk(queryTokens, chunk) }))
    .sort((left, right) => right.score - left.score || left.chunk.id.localeCompare(right.chunk.id));
  const selected = ranked.filter((entry) => entry.score > 0).slice(0, limit);
  const fallback = selected.length ? selected : ranked.slice(0, Math.min(2, limit));
  const chunks = fallback.map(({ chunk }) => ({
    id: chunk.id,
    title: chunk.title,
    text: chunk.text,
    source: chunk.source,
    url: chunk.url,
  }));
  const citations: Citation[] = chunks.map((chunk) => ({
    title: chunk.title,
    source: chunk.source,
    url: chunk.url,
    asOf: KNOWLEDGE_VERSION,
    dataNature: "VERSIONED_KNOWLEDGE",
  }));

  return {
    status: "AVAILABLE",
    dataNature: "VERSIONED_KNOWLEDGE",
    asOf: KNOWLEDGE_VERSION,
    citations,
    gaps: [
      "Esta base explica a implementação versionada; ela não substitui dados operacionais nem uma fonte legal oficial atualizada.",
    ],
    data: { chunks, knowledgeVersion: KNOWLEDGE_VERSION },
  };
}

export function knowledgeChunkCount() {
  return KNOWLEDGE_CHUNKS.length;
}
