# Limitacoes do Conector Compras.gov.br

- O runtime atual do MCL persiste em memoria; PostgreSQL esta modelado no Prisma, mas depende de `DATABASE_URL`, migracao e seed.
- O endpoint usado nao garante unidade de medida para o item de ARP.
- O conector nao afirma aderencia operacional entre necessidade MCL e instrumento publico.
- O vinculo e manual, auditado e indicado como potencial.
- `tamanhoPagina` constava em endpoints do OpenAPI, mas retornou HTTP 400 em consultas testadas; por isso o limite e local.
- O conector nao consome endpoints autenticados.
- Fornecedores e documentos sao tratados como dados publicos retornados pela API; nao ha enriquecimento externo.
- O conector nao cria empenhos canonicos sem dado publico adequado de empenho individual.
- Falhas da API externa atualizam a saude do conector, mas nao bloqueiam o restante do MCL.
- O store em memoria perde dados sincronizados ao reiniciar o processo.
