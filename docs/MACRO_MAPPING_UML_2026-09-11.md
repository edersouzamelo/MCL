# Confronto macro: UML, artigo e implementação

Data de referência: 11 SET 2026.

## Conclusão

O mapa do autor é coerente com a tese central do artigo: o MCL funciona como meta-sistema federado, preserva os sistemas de autoridade e correlaciona a trajetória administrativa, financeira e física. As oito etapas do mapa passam a ser a macroestrutura canônica da interface: **Necessidade → Crédito → Aquisição → Recebimento → Armazenagem → Entrega → Manutenção → Recolhimento**.

Também fica canônica a separação em três níveis: módulos **principais** (as oito etapas), **complementares** (governança e suporte transversal) e **suplementares** (ampliações que não condicionam o núcleo). A homepage e a navegação devem preservar essa diferença de peso e responsabilidade.

Manutenção e Recolhimento ampliam o recorte de cinco domínios apresentado no artigo e prolongam o passaporte digital ao ciclo de disponibilidade e ao fluxo reverso. Isso é extensão compatível, não contradição, desde que não seja descrita como capacidade já validada.

## Correções necessárias no desenho

1. A primeira página é um mapa de arquitetura/domínios, não um diagrama UML formal. Deve ganhar legenda, tipos de relação, direção do dado e indicação de fonte de autoridade.
2. Recebimento físico, ateste documental e liquidação financeira não podem ser fundidos. SIAFI pertence ao domínio financeiro e pode receber reflexos do ateste, mas não é o registro físico de entrada.
3. Sistemas específicos por classe — SIGM QDAA, SCA, SGM e SG7 — não devem representar sozinhos uma capacidade transversal. O desenho deve explicitar seu recorte.
4. “Banco central de dados” contradiz a abordagem federada se sugerir fusão integral das bases. O nome recomendado é **Registro de Continuidade Logística**, contendo eventos, vínculos, projeções e referências às fontes.
5. “Gestão de senhas” não deve significar guarda de credenciais dos sistemas legados. Substituir por **Gestão de identidade, acesso e segredos de integração**.
6. Há duplicação de “Gestão de Sistemas (Conectores)” e erro de digitação “ETM”; consolidar como **Gestão de conectores** e **ETL/importação centralizada**.
7. No diagrama de implantação, SQLAlchemy e SQLite não correspondem à implementação atual. O baseline usa Next.js, Prisma e PostgreSQL. A LLM é camada suplementar e não componente obrigatório do núcleo determinístico.
8. No diagrama de casos de uso, “memória” deve ser substituída por **registro de continuidade** ou **visão consolidada**. A LLM é componente interno da camada cognitiva, salvo quando o provedor externo for explicitamente modelado como sistema externo.
9. O caso “selecionar sistemas legados” deve se tornar **consultar fontes autorizadas** ou **administrar conectores**, sujeito a perfil e governança.
10. A sexta página vazia deve ser removida.

## Estado da implementação após o remapeamento

- Uma única definição versionada contém as oito etapas, suas rotas, domínios e objetivos.
- A página inicial e a navegação refletem as oito etapas.
- A página inicial e a navegação exibem separadamente módulos principais, complementares e suplementares.
- “Banco central de dados” foi materializado como **Registro de Continuidade Logística**, com superfície própria e limites federados explícitos.
- Recebimento, Armazenagem, Entrega, Manutenção e Recolhimento têm superfícies próprias.
- SGM (Classe VI) e SIGELOG (ODR) foram catalogados como fontes reais restritas e não integradas.
- As páginas declaram maturidade e limitações; não simulam integrações inexistentes.

## Limite deste corte

O remapeamento estabelece a arquitetura funcional e a interface. Não implementa integrações oficiais de manutenção ou recolhimento, nem altera silenciosamente os estados persistidos da unidade logística. Eventos e projeções desses dois domínios exigem catálogo funcional e regras de transição homologados antes de mudança no banco.
