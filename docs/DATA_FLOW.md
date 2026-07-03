# Fluxo de Dados

```mermaid
sequenceDiagram
  participant Fonte as Fonte sintética
  participant MCL as MCL
  participant Evento as Registro de evento
  participant Proj as Projeção
  participant UI as Interface
  Fonte->>MCL: Importa registros com fonte e confiança
  MCL->>Evento: Normaliza para vocabulário comum
  Evento->>Proj: Aplica regra determinística
  Proj->>UI: Exibe estado consolidado
  UI->>Evento: Operador registra novo evento
  Evento->>Proj: Recalcula sem apagar histórico
```

Cada dado consolidado conserva fonte, identificador, ocorrência, registro, confiança, versão de esquema e natureza.

## Fluxo Compras.gov.br

```mermaid
sequenceDiagram
  participant GOV as Compras.gov.br
  participant C as Conector MCL
  participant STG as ExternalRecord
  participant Q as Quarentena
  participant CAN as Canonico MCL
  participant UI as Interface
  C->>GOV: GET /modulo-arp/2_consultarARPItem
  GOV-->>C: resultado, totalRegistros, totalPaginas
  C->>C: timeout, retry, cache, Zod, hash
  alt registro valido
    C->>STG: payload bruto + proveniencia
    C->>CAN: SupplyItem, ItemVariant, Organization, AcquisitionInstrument, DocumentReference
  else registro invalido
    C->>Q: motivo + payload
  end
  CAN->>UI: /aquisicoes e cobertura contratual
```

O indicador de cobertura contratual usa apenas vinculos manuais `PODE_SER_ATENDIDA_POR` e nao e misturado com cobertura fisica sintetica.
