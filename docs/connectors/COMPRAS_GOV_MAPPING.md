# Mapeamento Compras.gov.br -> MCL

Versao: `compras-gov.arp-item.v1`

## Staging

| Campo externo | ExternalRecord |
| --- | --- |
| item completo | `payload` |
| hash canonico do payload | `payloadHash` |
| endpoint + query | `sourceUrl` |
| `dataHoraAtualizacao` ou `dataHoraInclusao` | `sourceUpdatedAt` |
| chave composta PNCP/ata/unidade/item | `externalId` |

## SupplyItem

| MCL | Origem |
| --- | --- |
| `persistentCode` | `CATMAT-{codigoItem}` |
| `name` | `nomePdm` ou resumo de `descricaoItem` |
| `description` | `descricaoItem` |
| `category` | `nomePdm` ou `MATERIAL_PUBLICO` |
| `baseUnit` | `nao fornecido` |
| `synthetic` | `false` |
| `sourceOrigin` | `PUBLICO` |

## ItemVariant

| MCL | Origem |
| --- | --- |
| `sku` | `CATMAT-{codigoItem}` |
| `label` | `nomePdm` ou resumo de `descricaoItem` |
| `size` | `nao fornecido` |
| `unit` | `nao fornecido` |

## Organization

| MCL | Origem |
| --- | --- |
| `code` | `UASG-{codigoUnidadeGerenciadora}` |
| `name` | `nomeUnidadeGerenciadora` |
| `type` | `UNIDADE_GERENCIADORA_PUBLICA` |
| `synthetic` | `false` |

## AcquisitionInstrument

| MCL | Origem |
| --- | --- |
| `type` | `ATA_DE_REGISTRO_DE_PRECOS_PUBLICA` |
| `reference` | `numeroAtaRegistroPreco` + `numeroItem` |
| `supplierName` | `nomeRazaoSocialFornecedor` |
| `supplierDocument` | `niFornecedor` |
| `organizationCode` | `codigoUnidadeGerenciadora` |
| `organizationName` | `nomeUnidadeGerenciadora` |
| `itemCode` | `codigoItem` |
| `itemDescription` | `descricaoItem` |
| `quantity` | `quantidadeHomologadaVencedor` ou `quantidadeHomologadaItem` |
| `unitValue` | `valorUnitario` |
| `totalValue` | `valorTotal` |
| `validFrom` | `dataVigenciaInicial` |
| `validUntil` | `dataVigenciaFinal` |
| `capacity` | `maximoAdesao` ou quantidade disponivel |
| `externalReference` | `numeroControlePncpAta` |
| `sourceOrigin` | `PUBLICO` |
| `confidence` | `0.72` por ser mapeamento publico ainda nao validado por humano |

## DocumentReference

| MCL | Origem |
| --- | --- |
| `documentType` | `REFERENCIA_PNCP_PUBLICA` |
| `repository` | `COMPRAS_GOV` |
| `externalReference` | `numeroControlePncpAta` ou `numeroControlePncpCompra` |
| `classificationLabel` | `PUBLICO` |
| `checksum` | `payloadHash` |

## ObjectLink

Criado somente por acao humana:

`NEED --PODE_SER_ATENDIDA_POR--> ACQUISITION_INSTRUMENT`

Campos:

- `actorId`
- `createdAt`
- `justification`
- `confidence`
- `sourceSystem=MCL-MANUAL`
- `sourceOrigin=MANUAL`

## Campos nao inferidos

- `Commitment`: nao criado quando houver apenas saldo/quantidade empenhada agregada.
- Aplicabilidade real do instrumento a uma necessidade.
- Unidade de medida do item quando o endpoint nao fornece.
- Equivalencia operacional entre CATMAT e item sintetico do piloto.
