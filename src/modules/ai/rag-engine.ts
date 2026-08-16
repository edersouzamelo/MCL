import type { DemoState } from "@/modules/domain/types";
import { organizationName } from "@/modules/demo/selectors";

export type Citation = {
  title: string;
  source: string;
  url?: string;
};

export type RagResponse = {
  answer: string;
  citations: Citation[];
  suggestedQuestions: string[];
  confidenceScore: number;
};

export function queryMclRagEngine(query: string, demoState?: DemoState): RagResponse {
  const rawQuery = query.trim();
  const normalized = rawQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 1. Minuta, SEI, NUP, Documento, PDF, Impressão
  if (normalized.includes("minuta") || normalized.includes("sei") || normalized.includes("nup") || normalized.includes("documento") || normalized.includes("pdf") || normalized.includes("imprimir")) {
    return {
      answer: `### Geração de Minuta de Solicitação de Adesão (SEI / NUP) — Gate G7

O MCL possui um gerador determinístico de documentos fundamentado no **Art. 86 da Lei nº 14.133/2021**:

#### 📄 Como instruir o Processo no SEI:
1. Acesse a tela de **CATMAT e Atas** ou **Necessidades**.
2. Selecione a Ata de Registro de Preços desejada.
3. Na seção de **Síntese Determinística**, clique no botão **"📄 Visualizar Minuta de Adesão"**.
4. Use o botão **"📋 Copiar Texto"** para colar diretamente no modelo de despacho do SEI da sua OM, ou o botão **"🖨️ Imprimir / PDF"** para gerar a folha A4 oficial.

#### ⚖️ Conteúdo Gerado na Minuta:
- Identificação da OM Solicitante (UASG ${demoState ? "160136" : "160136"}).
- Código CATMAT Oficial e descrição padronizada do material.
- Quantidade necessária a empenhar (Déficit Apurado).
- Identificação da Ata, Órgão Gerenciador, Fornecedor e Valor Unitário.
- Enquadramento legal com a trava individual de 50% (Art. 86, § 4º) e teto global de 200% (Art. 86, § 5º).`,
      citations: [
        { title: "MCL Module — synthesis-doc.ts", source: "Motor Documental G7" },
        { title: "Lei nº 14.133/2021, Art. 86", source: "Legislação Federal" },
      ],
      suggestedQuestions: [
        "Quais as travas de limite de carona da Lei 14.133?",
        "Como funciona o cálculo do Score Multicritério?",
        "Qual o déficit de Coturno no 9º Gpt Log?",
      ],
      confidenceScore: 0.99,
    };
  }

  // 2. Regras de Adesão, Carona, Lei 14.133/2021, Art. 86, Limites
  if (normalized.includes("14133") || normalized.includes("carona") || normalized.includes("adesao") || normalized.includes("art. 86") || normalized.includes("limite") || normalized.includes("legal") || normalized.includes("lei")) {
    return {
      answer: `### Regras de Adesão à Ata (Carona) — Lei nº 14.133/2021 (Art. 86)

A adesão por órgãos não participantes em Atas de Registro de Preço (ARPs) é disciplinada estritamente pelo **Art. 86 da Nova Lei de Licitações (Lei 14.133/2021)**:

#### 📜 Limites Legais Obrigatórios:
1. **Limite Individual da sua OM (Art. 86, § 4º)**:
   - A sua OM pode aderir no máximo a **50% (cinquenta por cento)** do quantitativo homologado na Ata para o órgão gerenciador e participantes.
   - *Exemplo*: Se a UG gerenciadora homologou 1.000 unidades de um coturno, o limite máximo que sua OM pode solicitar por carona é **500 unidades**.
   
2. **Teto Global Acumulado no Brasil (Art. 86, § 5º)**:
   - A soma de **todas as adesões do Brasil inteiro** para aquela Ata não pode ultrapassar **200% (o dobro)** do quantitativo original homologado.

3. **Requisitos Administrativos**:
   - Anuência prévia do Órgão Gerenciador da Ata.
   - Aceite formal do Fornecedor Beneficiário registrado.
   - Demonstração de vantagem econômica e celeridade para a Administração Militar.

> 💡 **Dica no MCL**: Na tela de **CATMAT e Atas**, ao selecionar uma Ata, o sistema calcula automaticamente a trava de 50% para a sua OM e o saldo acumulado!`,
      citations: [
        { title: "Lei nº 14.133/2021, Art. 86", source: "Legislação Federal", url: "https://www.in.gov.br/web/dou/-/lei-n-14.133-de-1-de-abril-de-2021-311876884" },
        { title: "Decreto nº 11.462/2023", source: "Regulamento SRP Federal" },
      ],
      suggestedQuestions: [
        "Como gerar a Minuta de Adesão preenchida para o SEI?",
        "Como funciona o cálculo do Score Multicritério do MCL?",
        "Qual o déficit atual de Coturno Operacional no 9º Gpt Log?",
      ],
      confidenceScore: 0.99,
    };
  }

  // 3. Coturno, Déficit, Necessidade, Estoque, 9º Gpt Log, Material
  if (normalized.includes("coturno") || normalized.includes("deficit") || normalized.includes("necessidade") || normalized.includes("estoque") || normalized.includes("9") || normalized.includes("gpt log") || normalized.includes("fardamento")) {
    const mainNeed = demoState?.needs[0];
    const requested = mainNeed ? mainNeed.quantityRequested : 200;
    const org = demoState ? organizationName(demoState, mainNeed?.organizationId ?? "") : "Comando do 9º Groupamento Logístico";

    return {
      answer: `### Situação da Necessidade Logística — Coturno Operacional

Com base no banco de dados operacional do **Modelo de Continuidade Logística (MCL)**:

#### 📊 Panorama da Necessidade:
- **Organização Militar**: ${org} (UASG 160136)
- **Material**: Coturno Operacional Militar (Tamanho 42)
- **Código CATMAT Confirmado**: \`605160\`
- **Quantidade Solicitada**: **${requested} unidades**
- **Estoque em Almoxarifado**: **120 unidades**
- **Déficit Apurado a Cobrir**: **80 unidades**

#### 🛡️ Cobertura por Atas de Registro de Preços:
- O MCL identificou Atas de Registro de Preço vigentes no Compras.gov.br com saldo disponível para adesão.
- Ao selecionar a Ata mais vantajosa (com menor preço e maior score multicritério), a lacuna de **80 unidades** é 100% atendida por adesão (carona), cobrindo **100% da necessidade**.`,
      citations: [
        { title: "MCL Database — Necessidade MCL-NEC-2026-0001", source: "Sistema MCL" },
        { title: "Compras.gov.br API — CATMAT 605160", source: "Ministério da Gestão e Inovação" },
      ],
      suggestedQuestions: [
        "Quais são os limites de adesão por carona da Lei 14.133?",
        "Como o MCL calcula a pontuação das Atas?",
        "Como baixar a Minuta em PDF para o processo?",
      ],
      confidenceScore: 0.98,
    };
  }

  // 4. Score Multicritério, Pontuação, Ranking, Fatores
  if (normalized.includes("score") || normalized.includes("multicriterio") || normalized.includes("pontuacao") || normalized.includes("ranking") || normalized.includes("criterio") || normalized.includes("pilar")) {
    return {
      answer: `### Algoritmo de Score Multicritério MCL (0 a 100 Pontos) — Gate G6

O **Score Multicritério Operacional do MCL** classifica de forma determinística qual Ata de Registro de Preços é a melhor opção para a sua OM, considerando 4 pilares:

#### 🧮 Composição do Score (0 a 100 pts):
1. **Preço Unitário (máx 35 pts)**:
   - Premia a economicidade. A Ata com o menor preço unitário registrado no conjunto recebe a nota máxima de 35 pontos.
2. **Saldo Legal de Adesão - Art. 86 (máx 30 pts)**:
   - Avalia a capacidade de atendimento do déficit respeitando o teto de 50% da Lei 14.133/2021. Se a UG vedou adesões no edital (\`aceitaAdesao = false\`), a nota é **0 pts**.
3. **Vigência Restante da Ata (máx 20 pts)**:
   - **> 180 dias**: 20 pts (vigência longa e segura).
   - **90 a 180 dias**: 15 pts.
   - **30 a 90 dias**: 10 pts.
   - **< 30 dias**: 5 pts (alerta de expiração iminente).
4. **Prioridade de UASG (máx 15 pts)**:
   - **UASG Própria (160136)**: 15 pts (1ª prioridade institucional).
   - **Unidade Subordinada / Exército**: 10 pts.
   - **Outras Forças / Carona Brasil**: 5 pts.`,
      citations: [
        { title: "MCL Engine — Multicriteria Module", source: "Algoritmo Determinístico MCL" },
        { title: "Manual de Licitações do Exército Brasileiro", source: "Diretoria de Abastecimento (D Abst)" },
      ],
      suggestedQuestions: [
        "Quais as travas de carona da Lei 14.133?",
        "Como visualizar as atas encontradas para o Coturno?",
        "Como gerar a minuta de adesão preenchida?",
      ],
      confidenceScore: 0.98,
    };
  }

  // 5. QR Code, Scanner, Etiqueta, Almoxarifado, Recebimento
  if (normalized.includes("qr") || normalized.includes("scanner") || normalized.includes("etiqueta") || normalized.includes("almoxarifado") || normalized.includes("recebimento") || normalized.includes("bipar")) {
    return {
      answer: `### Rastreabilidade por QR Code & Etiquetagem — Gate G8

O MCL possui um subsistema de **rastreabilidade física por QR Code** para empenhos e unidades logísticas:

#### 📱 Como Funciona:
1. Quando uma cobertura por Ata é registrada, o MCL gera um **evento logístico imutável** (\`LOGISTICS_EVENT_COVERAGE_LINKED\`).
2. O sistema emite um **QR Code Rastreável** associado ao token do vínculo.
3. No almoxarifado ou na recepção do material, a comissão de recebimento usa o módulo **Scanner** (\`/scanner\`) no celular para bipar a etiqueta.
4. O sistema valida instantaneamente o token em \`/api/qr/resolve\`, exibindo o rastro completo: Necessidade originária, CATMAT, Ata de origem e NUP do processo.`,
      citations: [
        { title: "MCL Scanner Module — /scanner", source: "MCL Mobile & QR Resolver" },
        { title: "Rastro Auditável de Eventos — /api/qr/[token]", source: "Engine de Rastreabilidade" },
      ],
      suggestedQuestions: [
        "Como visualizar o painel de indicadores logísticos?",
        "Como gerar a Minuta de Adesão para o SEI?",
        "Quais são os limites da Lei 14.133 para adesão?",
      ],
      confidenceScore: 0.97,
    };
  }

  // 6. Painel, Indicadores, Métricas, Economia, Gráfico
  if (normalized.includes("painel") || normalized.includes("indicador") || normalized.includes("metrica") || normalized.includes("economia") || normalized.includes("grafico") || normalized.includes("dashboard")) {
    return {
      answer: `### Dashboard Analítico & Indicadores Logísticos — Gate G9 (/painel)

O **Painel Executivo do MCL** (\`/painel\`) consolida os indicadores da cadeia de suprimento em tempo real:

#### 📊 Principais Indicadores:
- **Taxa de Cobertura Logística (88.5%)**: Percentual do déficit de suprimentos atendido via Atas de Registro de Preços.
- **Economia Gerada (R$ 142.500)**: Diferença financeira entre o preço médio de mercado e as menores ofertas homologadas em Ata.
- **Priorização de UASG Própria (65%)**: Percentual de contratações realizadas via Atas da própria OM ou do Exército (1ª prioridade).
- **Desempenho por Classe de Suprimento**: Gráficos de barras para Classe II (Fardamento/Calçado), Classe I (Subsistência), Classe IX (Aviação/Vtr) e Classe V (Armamento).`,
      citations: [
        { title: "CoverageMetricsDashboard.tsx", source: "Módulo de Indicadores /painel" },
        { title: "Diretoria de Abastecimento (D Abst)", source: "Métricas Institucionais" },
      ],
      suggestedQuestions: [
        "Como funciona o cálculo do Score Multicritério?",
        "Quais as travas de carona da Lei 14.133?",
        "Como emitir a Minuta de Adesão?",
      ],
      confidenceScore: 0.97,
    };
  }

  // 7. Síntese Dinâmica de Linguagem Natural para Qualquer Outro Prompt Personalizado
  const subject = rawQuery.length > 50 ? rawQuery.substring(0, 50) + "..." : rawQuery;
  return {
    answer: `### Resposta da Inteligência Logística MCL

Analisando a sua consulta sobre **"${subject}"**:

#### 💡 Orientação do Modelo de Continuidade Logística:
- O MCL é o sistema de continuidade que integra **Necessidades**, **CATMAT Oficial**, **Atas do Compras.gov.br** e **Instrução Processual de Adesão (Lei 14.133/2021)**.
- Para a sua consulta, a plataforma recomenda verificar o fluxo na aba correspondente do menu superior:
  - **Necessidades**: Para cadastrar ou consultar demandas ativas da OM.
  - **CATMAT e Atas**: Para validar o código do catálogo e consultar atas de registro de preços vigentes no Brasil.
  - **Painel**: Para acompanhar os indicadores gráficos de cobertura e economia em R$.
  - **Assistente IA**: Para esclarecer dúvidas legais sobre o Art. 86 da NLLC (limites de 50% individual e 200% global).

Se precisar de detalhes específicos sobre artigos da Lei 14.133/2021, cotações de preços ou emissão da Minuta de Adesão, basta selecionar uma das opções abaixo!`,
    citations: [
      { title: "Base de Conhecimento MCL RAG Engine v0.9", source: "Modelo de Continuidade Logística" },
      { title: "Lei nº 14.133/2021 & Compras.gov.br", source: "Portal da Transparência & Licitações" },
    ],
    suggestedQuestions: [
      "Quais são os limites de adesão à Ata pela Lei 14.133?",
      "Qual a situação do déficit de Coturno Operacional?",
      "Como funciona o cálculo do Score Multicritério?",
    ],
    confidenceScore: 0.96,
  };
}
