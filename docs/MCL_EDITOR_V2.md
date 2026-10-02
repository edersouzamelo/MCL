# Editor documental MCL

## Entrega desta fase

O editor online agora trabalha com três estados: fonte bruta, base compilada e alterações manuais. O rascunho é salvo por usuário e por cena. A publicação é uma ação explícita, com revisão esperada, verificação de conflitos e auditoria. Salvar um rascunho não altera o conteúdo publicado.

Cada elemento recebe um `elementId` estável. O reprocessamento tenta reaplicar alterações sobre a nova base por identidade semântica e informa conflitos quando a correspondência é ambígua, removida ou alterada nos mesmos campos. O layout salvo preserva coordenadas, dimensões, título e escolhas manuais. A organização automática ficou restrita ao comando explícito de proposta de layout.

O canvas inclui seleção simples e múltipla, marquee, grupos, camadas, bloqueio, ocultação, copiar, recortar, colar, duplicar, desfazer, refazer, arraste, oito alças, proporção de imagens, rotação, guias, alinhamento, distribuição, ordem Z, edição de texto, imagens, formas, gráficos e tabelas. A visualização usa os mesmos componentes de cena do monitor e da exportação.

## Persistência e rollout

Foi adicionada a tabela `MonitorEditorDraft`, com revisão otimista e escopo por organização, monitor, importação, cena e ator. A migração é aditiva. O endpoint `GET` carrega cenas, rascunhos e metadados de versões. `PUT` grava somente rascunhos. `POST` publica as cenas escolhidas numa transação, revalidando base, assets, dados de gráficos e preflight.

Imports legados que não possuem `compiledBase` e `overrides` continuam protegidos contra reextração automática. Imports no novo formato podem ser atualizados em uma mudança futura do compiler e passam pelo rebase antes da publicação.

## Verificação realizada

* `pnpm typecheck`: aprovado.
* `pnpm exec vitest run`: 331 testes aprovados.
* `pnpm lint`: aprovado, com 14 avisos preexistentes fora do editor.
* Browser regression com Chromium real: seleção, múltipla seleção, grupos, arraste, oito alças, undo/redo, edição inline, rascunho isolado, recarga, publicação, conflito, cópia, zoom, preview, imagem, gráfico, tabela, forma, rotação, distribuição, ordem Z e responsividade. Os dados de API desse teste são fixtures sintéticas e explicitamente não substituem banco real.
* PPTX real de nove cenas: IDs e formato do editor aprovados após extração estrutural. Quatro cenas dependem do worker de renderização nativa para validação visual completa, indisponível neste ambiente.

## Pendências para aprovação de produção

Ainda requerem validação no ambiente com banco, worker de compilação e Vercel: aplicar a migração, publicar um rascunho real, reprocessar uma revisão do compiler com rebase e executar o preflight/export do PPTX real. A interface ainda não oferece restauração de versão, resolução visual de cada conflito, criação ou reordenação de slides e estilos avançados de tabela e tipografia. Essas lacunas devem permanecer visíveis na revisão antes de liberar a funcionalidade para todos os operadores.
