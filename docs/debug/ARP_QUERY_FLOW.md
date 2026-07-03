# Caminho Real do Clique - Consulta de Atas (ARP)

Este documento mapeia o caminho completo do clique do usuário no botão "Consultar atas" até a atualização da tela.

```text
[Componente React] CoverageJourneyClient.tsx (Botão "Consultar atas")
  ↓
[Handler do Clique] searchAtas()
  ↓
[Fetch Interno] postJson("/api/coverage/atas/search", payload)
  ↓
[Rota Next.js] src/app/api/coverage/atas/search/route.ts (POST)
  ↓
[Serviço] searchArpsForConfirmedCatmat(...)
  ↓
[Cliente HTTP] createComprasGovClient(...)
  ↓
[Endpoint Externo] dadosabertos.compras.gov.br/modulo-arp/2_consultarARPItem
  ↓
[Normalizador] normalizeArpItem(...)
  ↓
[Persistência] saveNormalizedArpItemToDb(...) e saveAnalysisAndCandidatesToDb(...)
  ↓
[JSON de Resposta] Rota retorna resposta estruturada (ok: true/false, stage, etc.)
  ↓
[Estado React] CoverageJourneyClient atualiza ataQueryStatus, entries e error
  ↓
[Renderização] UI exibe a lista de atas ou mensagem detalhada de status/erro
```

## Detalhamento das Etapas

### 1. Botão e Handler React
* **Arquivo:** [CoverageJourneyClient.tsx](file:///c:/Users/eders/Desktop/MCL/mcl-piloto-classe-ii/src/components/CoverageJourneyClient.tsx)
* **Componente:** Botão com texto `Consultar atas` ou `Consultando`.
* **Função disparada:** `searchAtas()`
* **Entrada:** Valores estáticos do componente (`dateStart`, `dateEnd`, `need.id`).
* **Erros possíveis:** Campos de data em formato inválido ou `need.id` ausente.

### 2. Fetch Interno
* **Arquivo:** [CoverageJourneyClient.tsx](file:///c:/Users/eders/Desktop/MCL/mcl-piloto-classe-ii/src/components/CoverageJourneyClient.tsx)
* **Função:** `postJson`
* **Entrada:** Endpoint `/api/coverage/atas/search`, corpo `{ needId, dataVigenciaInicialMin, dataVigenciaInicialMax }`.
* **Saída:** JSON com os dados da resposta ou erro lançado.

### 3. Rota Next.js
* **Arquivo:** [route.ts](file:///c:/Users/eders/Desktop/MCL/mcl-piloto-classe-ii/src/app/api/coverage/atas/search/route.ts)
* **Método:** `POST`
* **Validações:**
  * Autenticação de sessão via `getServerSession`.
  * Verificação de existência e status do mapeamento confirmado (CATMAT 452757 para a calça).
* **Erros possíveis:** 401 Unauthorized, 400 Bad Request se validação de negócio falhar.

### 4. Serviço
* **Arquivo:** [service.ts](file:///c:/Users/eders/Desktop/MCL/mcl-piloto-classe-ii/src/modules/coverage/service.ts)
* **Função:** `searchArpsForConfirmedCatmat(...)`
* **Parâmetros:** `state`, dados da requisição, e opções com `actorId` e `requestId`.

### 5. Cliente HTTP & Endpoint Externo
* **Arquivo:** [http.ts](file:///c:/Users/eders/Desktop/MCL/mcl-piloto-classe-ii/src/modules/connectors/compras-gov/http.ts)
* **Função:** `createComprasGovClient` -> `getJson`
* **Endpoint externo:** `https://dadosabertos.compras.gov.br/modulo-arp/2_consultarARPItem`
* **Erros possíveis:** Timeout (AbortError), indisponibilidade do servidor externo (502/503), limite de taxa (429).

### 6. Normalização e Persistência
* **Arquivo:** [normalizers.ts](file:///c:/Users/eders/Desktop/MCL/mcl-piloto-classe-ii/src/modules/connectors/compras-gov/normalizers.ts) e [service.ts](file:///c:/Users/eders/Desktop/MCL/mcl-piloto-classe-ii/src/modules/coverage/service.ts)
* **Funções:** `normalizeArpItem(...)`, `saveNormalizedArpItemToDb(...)` e `saveAnalysisAndCandidatesToDb(...)`
* **Descrição:** Se dados forem retornados, converte para o modelo interno e persiste no PostgreSQL. Se nenhum for encontrado, atualiza o status do banco para `NO_RESULTS`.

### 7. Atualização do Estado React e Renderização
* **Descrição:** O frontend recebe a resposta do fetch. Se a consulta falhar ou expirar, a resposta JSON de erro limpa o loading e exibe a causa. Se for bem sucedida, atualiza `entries` e `synthesis` para renderizar as atas.
