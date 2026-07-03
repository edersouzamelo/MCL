# Pesquisa da API Oficial Compras.gov.br

Este documento descreve as especificações e mapeamento dos endpoints oficiais utilizados pelo MCL para consultas de cobertura.

**Data da Verificação:** 3 de julho de 2026  
**Fonte Oficial:** Swagger UI (`https://dadosabertos.compras.gov.br/swagger-ui/index.html`) e OpenAPI em `https://dadosabertos.compras.gov.br/v3/api-docs`.

---

## Endpoints Utilizados

### 1. Pesquisa de Materiais (CATMAT)
* **Endpoint:** `GET /modulo-material/4_consultarItemMaterial`
* **Parâmetros Principais:**
  * `descricaoItem` (String) — Termo textual de busca do material.
  * `codigoItem` (Integer) — Código direto do CATMAT.
  * `codigoClasse` (Integer) — Classe de suprimento (ex: 8430 para calçados).
  * `statusItem` (Boolean) — Filtrar itens ativos/inativos (Padrão: `true`).
  * `pagina` (Integer) — Página da consulta.
* **Exemplo de Resposta Sanitizada:**
  ```json
  {
    "resultado": [
      {
        "codigoItem": 605160,
        "descricaoItem": "BOTA SEGURANCA, MATERIAL COURO HIDROFUGADO, SOLA BORRACHA ANTIDERRAPANTE...",
        "codigoGrupo": 84,
        "codigoClasse": 8430,
        "codigoPdm": 1415,
        "statusItem": true,
        "dataHoraAtualizacao": "2026-05-08T16:59:41"
      }
    ],
    "totalRegistros": 1,
    "paginasRestantes": 0
  }
  ```

### 2. Pesquisa de Atas Vigentes (ARP)
* **Endpoint:** `GET /modulo-arp/2_consultarARPItem`
* **Parâmetros Principais:**
  * `codigoItem` (Integer) — Código do CATMAT confirmado.
  * `tipoItem` (String) — Fixado como `Material`.
  * `dataVigenciaInicialMin` (String: YYYY-MM-DD) — Início do período de vigência.
  * `dataVigenciaInicialMax` (String: YYYY-MM-DD) — Fim do período de vigência.
  * `pagina` (Integer) — Página para controle de paginação.

### 3. Detalhes de Saldos e Unidades Participantes
* **Endpoint:** `GET /modulo-arp/3_consultarUnidadesItem`
* **Parâmetros Principais:**
  * `numeroAta` (String) — Número identificador da ata consultada.
  * `unidadeGerenciadora` (String) — Código UASG da unidade gerenciadora.
  * `numeroItem` (String) — Número de item dentro da ata.
* **Campos Retornados e Mapeamento:**
  * `quantidadeRegistrada` — Quantidade alocada inicialmente para a unidade participante.
  * `saldoAdesoes` — Saldo restante elegível para adesão de caronas.
  * `saldoRemanejamentoEmpenho` — Saldo disponível para remanejamento ou empenho de participantes.
  * `aceitaAdesao` — Flag indicando se a ata permite carona de outros órgãos.
