# Pesquisa da API Compras.gov.br - 2026-07-02

Fonte oficial consultada: `https://dadosabertos.compras.gov.br/swagger-ui/index.html` e OpenAPI `https://dadosabertos.compras.gov.br/v3/api-docs`.

## Endpoints examinados

| Modulo | Endpoint | Uso observado |
| --- | --- | --- |
| Catalogo material | `/modulo-material/4_consultarItemMaterial` | CATMAT, descricao, grupo, classe, PDM e atualizacao. |
| ARP | `/modulo-arp/1_consultarARP` | Atas, vigencia, orgao, unidade, PNCP, valor total e objeto. |
| ARP item | `/modulo-arp/2_consultarARPItem` | Itens de ata com CATMAT, fornecedor, quantidade, valor, vigencia e saldo de empenho. |
| Contratos | `/modulo-contratos/1_consultarContratos` | Contratos por orgao, fornecedor, objeto, vigencia, valor global e PNCP. |
| Contratos item | `/modulo-contratos/2_consultarContratosItem` | Itens de contrato, quando disponiveis por orgao/filtros. |
| Contratacoes PNCP | `/modulo-contratacoes/1_consultarContratacoes_PNCP_14133` | Compras PNCP Lei 14.133/2021. |
| Itens PNCP | `/modulo-contratacoes/2_consultarItensContratacoes_PNCP_14133` | Itens de contratacoes PNCP com CATMAT/CATSER e resultados. |
| Fornecedor | `/modulo-fornecedor/1_consultarFornecedor` | Fornecedores ativos por CNPJ/CPF/natureza/porte/CNAE. |
| UASG | `/modulo-uasg/1_consultarUasg` | Unidade administrativa por codigo/status/UF/orgao. |

## Endpoint usado na v0.1.0

`GET /modulo-arp/2_consultarARPItem`

Parametros usados:

- `pagina`: pagina numerica, iniciando em 1.
- `dataVigenciaInicialMin`: data `YYYY-MM-DD`.
- `dataVigenciaInicialMax`: data `YYYY-MM-DD`.
- `tipoItem=Material`.
- `codigoUnidadeGerenciadora`: opcional.
- `codigoItem`: opcional, usado como filtro CATMAT.
- `codigoModalidadeCompra`: opcional.

Variaveis MCL:

- `COMPRAS_GOV_API_BASE_URL`
- `COMPRAS_GOV_SYNC_ENABLED`
- `COMPRAS_GOV_PAGE_SIZE`
- `COMPRAS_GOV_REQUEST_TIMEOUT_MS`
- `COMPRAS_GOV_CACHE_TTL_SECONDS`
- `COMPRAS_GOV_UNIT_CODE`
- `COMPRAS_GOV_CATMAT_CODE`
- `COMPRAS_GOV_MODALITY_CODE`
- `COMPRAS_GOV_DATE_START`
- `COMPRAS_GOV_DATE_END`
- `COMPRAS_GOV_KEYWORD`

## Paginacao e limites

- O padrao atual da API usa `pagina`, `resultado`, `totalRegistros`, `totalPaginas` e `paginasRestantes`.
- Em testes manuais, `tamanhoPagina` retornou HTTP 400 em alguns endpoints apesar de constar no OpenAPI. O conector nao envia `tamanhoPagina`; ele limita localmente por `COMPRAS_GOV_PAGE_SIZE` e `COMPRAS_GOV_MAX_PAGES`.
- O conector usa timeout, retry limitado, backoff, cache em memoria por TTL e intervalo minimo entre chamadas.

## Campos disponiveis no ARP Item

- Identificacao da ata: `numeroAtaRegistroPreco`, `numeroControlePncpAta`.
- Compra: `numeroCompra`, `anoCompra`, `idCompra`, `numeroControlePncpCompra`.
- Unidade: `codigoUnidadeGerenciadora`, `nomeUnidadeGerenciadora`.
- Item: `numeroItem`, `codigoItem`, `descricaoItem`, `tipoItem`, `codigoPdm`, `nomePdm`.
- Fornecedor: `niFornecedor`, `nomeRazaoSocialFornecedor`, `classificacaoFornecedor`, `situacaoSicaf`.
- Quantidades e valores: `quantidadeHomologadaItem`, `quantidadeHomologadaVencedor`, `maximoAdesao`, `quantidadeEmpenhada`, `valorUnitario`, `valorTotal`.
- Datas: `dataAssinatura`, `dataVigenciaInicial`, `dataVigenciaFinal`, `dataHoraInclusao`, `dataHoraAtualizacao`, `dataHoraExclusao`.

## Campos ausentes ou nao assumidos

- Nao ha garantia de unidade de medida no ARP Item usado.
- A aplicabilidade a uma necessidade MCL nao e inferida automaticamente.
- O conector nao cria empenho canonico quando a API so fornece saldo/quantidade empenhada agregada.
- Relacoes com sistemas internos ou saldos oficiais nao sao inferidas.

## Exemplo sanitizado

```json
{
  "numeroAtaRegistroPreco": "00067/2025",
  "codigoUnidadeGerenciadora": "257023",
  "numeroItem": "00010",
  "codigoItem": 485523,
  "descricaoItem": "DISPOSITIVO P/ MEDIDAS ANTROPOMETRICAS...",
  "tipoItem": "Material",
  "quantidadeHomologadaVencedor": 105,
  "valorUnitario": 11.8,
  "valorTotal": 1239,
  "dataVigenciaInicial": "2026-01-01",
  "dataVigenciaFinal": "2026-12-01",
  "numeroControlePncpAta": "00394544000185-1-001959/2025-000007"
}
```

## Restricoes

- API externa pode ficar indisponivel; o MCL deve continuar carregando com o ultimo estado em memoria.
- Dados publicos podem conter mudancas de schema; respostas passam por Zod.
- Payload bruto fica em staging com hash e status de processamento.
