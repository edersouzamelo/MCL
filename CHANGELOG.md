# Changelog

## v1.0.0 - 2026-07-03

- **Persistência Real PostgreSQL/Prisma:** Integração completa com tabelas de análises de materiais no Neon/PostgreSQL local, com migrações, schema atualizado e inicialização preguiçosa robusta para testes.
- **Generalização de Materiais:** Suporte dinâmico a qualquer material Classe II (coturnos, gandolas, calças, etc.), eliminando menções estruturais rígidas a termos exclusivos.
- **Interface e Painel de Cobertura:** Nova página principal `/analises/materiais`, roteamento canônico `/analises/materiais/[needId]` e seção analítica expandida no dashboard geral `/painel`.
- **Rastro de Execução (Como o MCL pesquisou):** Exibição em tempo real na UI de parâmetros de busca, endpoints governamentais consumidos, registros retornados e duração total.
- **Modelo de Confiança e Déficit:** Fórmulas matemáticas determinísticas validadas por 37 testes unitários (100% de sucesso).

## v0.1.0 - 2026-07-02

- Bootstrap do protótipo MCL Piloto Classe II.
- Núcleo de eventos append-only com projeção determinística.
- Dados sintéticos de necessidade de 200 pares de coturnos com cobertura por estoque e aquisição.
- Dashboard, necessidades, QR/passaporte, scanner, registro de evento, conectores, divergências, importação e auditoria.
- Schema Prisma/PostgreSQL, seed, testes, CI, PWA e artefato de publicação.
