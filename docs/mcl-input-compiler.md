# MCL Input Compiler: auditoria e fundações

Base auditada: `34e0529`, main, 01/10/2026. Implementação isolada em `feat/mcl-input-compiler-foundations`. Elo: ingestão documental e continuidade informacional dos monitores CCOL. Nenhum deploy ou alteração de dados de produção nesta entrega.

Princípio: integridade informacional > legibilidade > organização > estética. Não saber é um resultado válido. PASS estrutural não significa fidelidade visual comprovada.

## Auditoria do caminho existente

| Capacidade | Arquivo ou rota | Evidência e risco |
|---|---|---|
| Upload | `api/grupamento/monitor-content/chunk`, `finalize`; `repository.ts` | Upload em partes, validação, timeout, montagem e extração antes de persistir importação PREVIEW. Erro fatal anterior à persistência ainda depende dos chunks temporários. |
| PPTX | `monitor-content/pptx-layout.ts`, `extract.ts` | ZIP/XML determinístico. Cinco tipos de elemento: texto, forma, imagem, gráfico, tabela. Regex não resolve herança de layout/master nem transformações de grupos. |
| Texto | `paragraphs`, `textNodes`, `extract.ts`, `text-document.ts`, `text-slide.ts` | Textos de caixas e células. Relatórios textuais podem ser segmentados. Texto herdado de masters e texto em imagens não têm cobertura completa. |
| Gráficos | `pptx-layout.ts`: `chart`, `series`; `MonitorDocumentChart.tsx`, `chart-geometry.ts`, `chart-label-layout.ts`, `pie-layout.ts` | Preserva séries, categorias, valores, cores, rótulos em cache, eixos e formatos suportados. Área/scatter/combinações e composição nativa não têm renderer fiel. Recharts usa outra área de plotagem. |
| Imagens | `addAsset`, `extract.ts`; rota `assets/[assetId]` | Formatos e quotas. Antes, figura sem formato suportado podia desaparecer com aviso. Crop/flip/rotação não reproduzidos. |
| Tabelas | `tableRows`, `table-layout.ts`, `table-fit.ts`, `MonitorDocumentTable.tsx` | Conteúdo de células e paginação existentes. Mesclagens, estilos e hierarquia complexa não são completamente representados. |
| Normalização | `presentation-title.ts`, `presentation-intelligence.ts` | Sentence case e contraste. Lista de tokens protegidos incompleta. |
| Dimensões | `box`, `presentation-layout.ts`, `monitorTitleElements`, `MonitorViewport.tsx` | Coordenadas relativas, ampliação, reflow do corpo e ajuste de viewport. Antes, o recorte visual não tinha um contrato de integridade. |
| Remoções | `pptx-layout.ts`, `prepareMonitorElements` | Fundo neutro sobre gráfico, imagens pequenas, textos sem número fora da tela e molduras podiam ser omitidos por heurísticas de aparência. |
| Monitores | `GrupamentoMonitorClient.tsx`, `MonitorDocumentScene.tsx`, `MonitorDocumentText.tsx`, `MonitorDocumentTable.tsx` | Composição do playlist e renderização. `overflow-hidden` ainda requer validação visual/DOM para provar legibilidade. |
| Exceções | `correction.ts`, `presentation-title.ts`, `presentation-layout.ts`, layouts específicos | Correção humana, capas integrais, anotações, títulos e gráficos dominantes. Capacidades preservadas, sem condicional por nome de arquivo/OM/monitor. |
| Persistência | `repository.ts`; modelos Prisma `MonitorContentImport`, `MonitorContentScene`, `MonitorContentAsset` | Original em `rawFile`, checksum, assets, JSON de cenas, aprovação. Reprocessamento substitui derivados. Não existe ainda histórico imutável de todas as versões derivadas. |
| Editor | `MonitorOnlineEditor.tsx`, `online-editor.ts`, `online-editor-repository.ts` | Objetos JSON, revisão otimista, escopo por organização, auditoria e restrição de alterações dos valores dos gráficos. Não há ainda reclassificação semântica de objetos. |
| SAG | `sag.ts`, `pdf-sag.ts`, telas orçamentárias e testes próprios | Pipeline separado. Não foi substituído pelo compilador documental. Catálogo PI/Nome_PI e paginação atuais permanecem. |
| PWA/offline | `monitor-cache.ts`, `monitor-offline-html.ts` | Cache existente e HTML capturado do renderer. Nenhuma mudança no mecanismo de cache ou nos controles. |

## Arquitetura integrada nesta entrega

1. `raw_input`: continua armazenado como bytes e checksum em MonitorContentImport. O compilador referencia SHA-256 do arquivo e XML do slide. Não modifica bytes originais.
2. `parsed_input`: snapshot independente dos objetos extraídos, anterior às remoções e à elevação de anotações.
3. Representação intermediária: IDs locais estáveis, origem por slide, objetos com texto/estilo/caixa/z-order e metadados existentes de gráficos e tabelas; relações `inside`, `overlaps`, `annotates`.
4. `interpreted_content`: arquétipo, score heurístico, blocos atômicos e estratégia, persistidos em `payload.inputCompiler`.
5. `normalized_content`: `payload.layout.elements`. Ajuste afim único para overflow, preservando distâncias relativas e escalando fontes proporcionalmente.
6. `rendered_output`: renderer React existente consome a estratégia. Ainda não há snapshot persistido do DOM nem captura visual obrigatória.
7. Preflight: comparação multiconjunto, preservação de duplicatas, dados completos de gráficos/tabelas, identidade de imagens, validade das caixas e limites do frame. Bloqueios do parser também impedem aprovação e atualização automática de conteúdo publicado.

Para novos payloads compilados, o renderer e o editor deixam de aplicar a limpeza agressiva legada. Payloads antigos conservam seu comportamento. A versão global de extração permanece 6, evitando disparar reprocessamento automático em toda a instalação durante esta etapa. Adotar a nova fundação nos materiais antigos requer reprocessamento explícito.

Imagens pequenas e textos sem números não são classificados automaticamente como decoração. Foi mantida uma transformação existente específica de capacidade: fundo neutro atrás do gráfico, sem contorno nem texto intersectante. A decisão e os objetos originais ficam registrados. Sua confiança é uma heurística, não probabilidade estatística calibrada.

## Fidelidade e bloqueio seguro

Anotações manuais sobre gráficos são preservadas no snapshot, associadas geometricamente ao gráfico, elevadas no z-order e agrupadas. O sistema **não afirma** que reconheceu a barra: a caixa nativa da área de plotagem não está disponível no renderer. A publicação fica bloqueada até renderizar o original fielmente.

Também ficam em PREVIEW, com original persistido e avisos, slides com grupos, objetos sem geometria resolvida, imagens indisponíveis, recortes, rotações/espelhamentos, gráficos não suportados/combinados, rótulos incompletos, objetos incorporados/conectores/diagramas reconhecidos como não suportados e strings XML sem correspondência extraída.

Este é um bloqueio seguro, **não um fallback visual pronto**. Um slide em prévia pode continuar mostrando uma aproximação; não pode ser aprovado quando bloqueado. O catálogo de limitações não é um detector completo de todos os elementos OOXML. Nenhum material novo deve ser considerado visualmente validado apenas por PASS estrutural.

## Diagnóstico

`GET /api/grupamento/monitor-content/{importId}/diagnostics`: ADMIN ou LOGISTICS_MANAGER da mesma organização. JSON com Scene Graph, snapshot, relações, confiança, estratégias, decisões e preflight. Métricas por importação: slides de origem deduplicados, bloqueios, preservação de composição, cenas editadas, confiança média e chamadas LLM (zero). Não representa ainda a métrica global de importações corretas sem intervenção humana.

A rota de listagem já entrega as cenas e avisos para prévia. O original continua disponível pela rota `source`. Não foi criada nova dependência de IA.

## Regressões e aceite

`tests/unit/monitor-input-compiler.test.ts` cobre anotações, duplicatas, documentos, capa integral, tokens militares, bloqueios, figuras pequenas, overflow proporcional, dados de tabela/gráfico e um arquivo real do repositório. Os testes anteriores de monitores e SAG continuam executados.

O modelo real `public/briefing/model.pptx` produziu uma cena e três assets, bloqueada por crop/flip/rotação. Isso demonstra a dependência de fallback, não valida a fidelidade do arquivo. Os arquivos reais dos incidentes do Monitor 5 e Monitor 7 não estavam disponíveis no checkout; não foram inventados. Casos sintéticos não substituem esse corpus.

Aceite da fundação: novos imports preservam snapshot e original; nenhuma imagem/texto é omitida pelo tamanho; conteúdo bloqueado não é publicável; atualização automática não substitui cena aprovada por extração bloqueada; tokens de `9º B MNT` mantidos; controles, seleções SAG e persistência têm regressões verdes. A arquitetura completa solicitada ainda não está concluída.

## Próximas camadas e dependências

| Pendência | Implementação correta / dependência |
|---|---|
| Fallback visual prioritário | Worker isolado com LibreOffice/PDF e rasterização/SVG em alta qualidade. Fonts controladas, timeout, limites, isolamento e arquivos de saída verificáveis. O binário local de teste não estabelece disponibilidade na Vercel. Armazenar imagem integral/região e ligar ao original/hash. |
| Grupos, masters, crop e transformações | Parser OOXML com hierarquia e matrizes, herança de layout/master, geometria nativa e IDs nativos. Não achatar grupos por regex e declarar fidelidade. |
| Blocos atômicos fielmente exibíveis | Renderizar região original com dependências, preservar título nativo quando necessário, comparar output; o agrupamento atual é metadata conservadora. |
| Preflight visual e legibilidade | Captura da origem e DOM final em dimensões-alvo, medição de overflow/fontes/contraste, OCR e detecção regional. Reflow altera pixels: não usar igualdade de screenshots como critério universal. |
| Versionamento derivado imutável | Modelo de execution/revision com versões de parser/layout e ponteiros para raw, parsed, interpreted, normalized, render e revisões humanas. Schema/migração ainda não alterados. |
| Cache | Hash de conteúdo completo incluindo gráficos, mídias, theme/master, versões e correções humanas. Hash do XML do slide isolado não pode ser chave de cache suficiente. Sem cache ativo nesta entrega. |
| LLM semântico opcional | Contrato schema de classificação por IDs, verificação de referências, budget, timeout, cache e auditoria. Apenas após heurísticas e sem converter score em prova de fidelidade. |
| Catálogos | Unificar catálogo OM/siglas, PI/Nome_PI, UASG e medidas com proveniência, conflitos e importação incremental. Lista de títulos foi ampliada; catálogo dinâmico universal ainda não existe. |
| Mesa de exceções | Exibir regiões bloqueadas, reclassificar/confirmar interpretação, revisar rasterização e salvar decisão versionada. Editor atual mantido; não libera bloquear fidelidade por edição cosmética. |
| Telemetria global | Registrar execução e revisão/validação humana. PASS/ausência de edição não prova importação correta. Calcular taxa correta sem intervenção apenas com critério de qualidade observável. |
| Corpus real permanente | Incluir PPTX originais dos incidentes, com autorização/dados minimizados e outputs de referência. Validação A e E exige fallback, não apenas detecção; demais exemplos também precisam inspeção visual. |

Risco principal desta entrega: mais arquivos podem ser bloqueados na importação, pois o mecanismo antigo aceitava representações incompletas. Não aplicar diretamente em produção antes de integrar o fallback e verificar os materiais reais. Integração proposta para revisão em PR, sem merge.

## Verificação executada

- Suíte completa: 56 arquivos, 299 testes aprovados.
- `npm run typecheck`: aprovado.
- `npm run build`: build Next.js local, sem migrações externas; resultado registrado na revisão.
- ESLint nos arquivos alterados: sem erros. `extract.ts` possui aviso preexistente de função legada não utilizada.
- `git diff --check`: aprovado.
- Não houve teste integrado contra banco de produção, inspeção em TV física, validação visual dos incidentes reais nem deploy. Dependências instaladas via npm sem alterar manifests/lock; o repositório fornece pnpm-lock.yaml.
