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

export const MCL_KNOWLEDGE_BASE = [
  {
    topic: "Lei 14.133/2021 - Art. 86 (Caronas / Adesão à Ata)",
    content: `A adesão a atas de registro de preços por órgãos ou entidades que não participaram do procedimento licitatório (órgãos caronas) é regulamentada pelo Art. 86 da Lei nº 14.133/2021:
- Art. 86, caput: Autoriza a adesão mediante anuência do órgão gerenciador e do fornecedor registrado.
- Art. 86, § 4º (Trava Individual): As aquisições ou as contratações adicionais por órgão carona NÃO poderão exceder a 50% (cinquenta por cento) dos quantitativos dos itens do instrumento convocatório e registrados na ata de registro de preços para o órgão gerenciador e para os órgãos participantes.
- Art. 86, § 5º (Teto Global Acumulado): O quantitativo decorrente das adesões à ata de registro de preços NÃO poderá exceder, na totalidade, ao dobro (200%) do quantitativo de cada item registrado na ata de registro de preços para o órgão gerenciador e órgãos participantes, independente do número de órgãos não participantes que aderirem.`,
  },
  {
    topic: "Score Multicritério MCL (0 a 100 pontos)",
    content: `O Algoritmo de Score Multicritério do MCL avalia a exequibilidade operacional de cada Ata de Registro de Preços encontrada no Compras.gov.br com base em 4 pilares determinísticos:
1. Preço Unitário (máx 35 pts): Pontuação inversamente proporcional ao valor unitário. Menor preço do conjunto recebe 35 pts.
2. Saldo Legal Art. 86 (máx 30 pts): Avalia o saldo disponível para adesão conforme a trava de 50% por item da Lei 14.133/2021. Se aceitaAdesao = false, recebe 0 pts.
3. Vigência da Ata (máx 20 pts): >180 dias restantes = 20 pts; 90 a 180 dias = 15 pts; 30 a 90 dias = 10 pts; <30 dias = 5 pts.
4. Prioridade de UASG (máx 15 pts): UASG própria (160136) = 15 pts; Unidade Subordinada/Exército = 10 pts; Outras Forças/Brasil = 5 pts.`,
  },
  {
    topic: "Funcionamento do Sistema MCL",
    content: `O Modelo de Continuidade Logística (MCL) é a plataforma informacional que correlaciona a demanda da OM com a execução física e legal:
- Necessidades Logísticas: Cadastro das demandas de material (Classe II - Fardamento, Classe I, Classe V, etc.).
- Confirmação de CATMAT: Busca oficial no catálogo Compras.gov.br e vinculação humana confirmada.
- Consulta de ARPs: Pesquisa em tempo real de Atas de Registro de Preço vigentes no Brasil.
- Minuta de Adesão (G7): Geração automática do documento formal fundamentado na Lei 14.133/2021 para instrução do processo no SEI/NUP.
- QR Code Rastreável (G8): Etiquetagem de empenhos para conferência rápida no almoxarifado via celular.`,
  },
];

export function queryMclRagEngine(query: string, demoState?: DemoState): RagResponse {
  const normalized = query.toLowerCase().trim();

  // 1. Perguntas sobre Adesão, Carona e Lei 14.133/2021
  if (normalized.includes("14.133") || normalized.includes("carona") || normalized.includes("adesao") || normalized.includes("adesão") || normalized.includes("art. 86") || normalized.includes("limite")) {
    return {
      answer: `### Regras de Adesão à Ata (Carona) — Lei nº 14.133/2021 (Art. 86)

A adesão por órgãos não participantes em Atas de Registro de Preço (ARPs) é disciplinada estritamente pelo **Art. 86 da Nova Lei de Licitações (Lei 14.133/2021)**:

#### 📜 Limites Legais Obrigatórios:
1. **Limite Individual da sua OM (Art. 86, § 4º)**:
   - A sua OM pode aderir no máximo a **50% (cinquenta por cento)** do quantitativo homologado na Ata para o órgão gerenciador e participantes.
   - *Exemplo*: Se a UG gerenciadora homologou 1.000 unidades de um coturno, o limite máximo que sua OM pode solicitar é **500 unidades**.
   
2. **Teto Global Acumulado no Brasil (Art. 86, § 5º)**:
   - A soma de **todas as adesões do Brasil inteiro** para aquela Ata não pode ultrapassar **200% (o dobro)** da quantidade total homologada no edital.

3. **Requisitos Administrativos**:
   - Anuência prévia do Órgão Gerenciador da Ata.
   - Aceite do Fornecedor Beneficiário registrado.
   - Demonstração da vantagem econômica e conveniência para a Administração Militar.

> 💡 **Dica no MCL**: Na tela de **CATMAT e Atas**, ao selecionar uma Ata, o sistema calcula automaticamente a Minuta de Solicitação de Adesão pré-preenchida com estes parâmetros legais!`,
      citations: [
        { title: "Lei nº 14.133/2021, Art. 86", source: "Legislação Federal", url: "https://www.in.gov.br/web/dou/-/lei-n-14.133-de-1-de-abril-de-2021-311876884" },
        { title: "Decreto nº 11.462/2023", source: "Regulamento SRP Federal" },
      ],
      suggestedQuestions: [
        "Como funciona o cálculo do Score Multicritério do MCL?",
        "Qual o déficit atual de Coturno Operacional no 9º Gpt Log?",
        "Como emitir a Minuta de Adesão para o SEI?",
      ],
      confidenceScore: 0.99,
    };
  }

  // 2. Perguntas sobre Coturno, Déficit, Necessidade ou 9º Gpt Log
  if (normalized.includes("coturno") || normalized.includes("deficit") || normalized.includes("déficit") || normalized.includes("necessidade") || normalized.includes("estoque") || normalized.includes("9º")) {
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

  // 3. Perguntas sobre Score Multicritério
  if (normalized.includes("score") || normalized.includes("multicriterio") || normalized.includes("multicritério") || normalized.includes("pontuacao") || normalized.includes("pontuação") || normalized.includes("ranking")) {
    return {
      answer: `### Algoritmo de Score Multicritério MCL (0 a 100 Pontos)

O **Score Multicritério Operacional do MCL** classifica de forma determinística qual Ata de Registro de Preços é a melhor opção para a sua OM, considerando 4 pilares:

#### 🧮 Composição do Score:
1. **Preço Unitário (máx 35 pts)**:
   - Premia a economicidade. A Ata com o menor preço unitário registrado recebe a nota máxima de 35 pontos.
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
      confidenceScore: 0.97,
    };
  }

  // 4. Resposta Padrão RAG / Orientação Geral do Sistema
  return {
    answer: `### Assistente de Inteligência Logística MCL

Sou o assistente especializado do **Modelo de Continuidade Logística (MCL)**. Posso orientar você sobre a operação da plataforma, legislação de licitações e dados das suas necessidades de suprimento:

#### 💡 Em que posso ajudar você agora?
- **Orientação Legal**: Regras de adesão à ata (caronas), limites de 50% e 200% do Art. 86 da Lei 14.133/2021.
- **Consulta de Materiais**: Informações sobre necessidades ativas (Coturno Operacional, Calça, Papel A4, Tijolo).
- **Análise de Atas**: Critérios do Score Multicritério (Preço, Vigência, Saldo Legal e Prioridade de UASG).
- **Instrução de Processos**: Como gerar e exportar a **Minuta de Solicitação de Adesão** para o SEI/NUP.

Digite sua pergunta abaixo ou escolha um dos atalhos rápidos!`,
    citations: [
      { title: "Base Conhecimento MCL v0.9", source: "Modelo de Continuidade Logística" },
      { title: "Lei nº 14.133/2021", source: "Portal da Legislação Federal" },
    ],
    suggestedQuestions: [
      "Quais são os limites de adesão à Ata pela Lei 14.133?",
      "Qual a situação do déficit de Coturno Operacional?",
      "Como funciona a pontuação do Score Multicritério?",
    ],
    confidenceScore: 0.95,
  };
}
