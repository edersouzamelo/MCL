# S1-1 — Evidência de validação

- Data: 12 AGO 2026
- Resultado local: **APROVADO**
- Resultado de ambiente: **PENDENTE DO PREVIEW**

## Matriz local

| Controle | Resultado |
| --- | --- |
| Demo sem configuração | Desativado |
| `DEMO_AUTH_ENABLED=false` | Desativado |
| Demo com segredo, senha e opt-in | Ativado |
| Identidade sem vínculo | Negada |
| Papéis do operador demonstrativo | `ADMIN`, `LOGISTICS_MANAGER` |
| Papéis universais adicionados pela sessão | Nenhum |
| CATMAT sem sessão | HTTP 401 |
| CATMAT com `COMMAND_VIEWER` | HTTP 403 |
| CATMAT com `LOGISTICS_MANAGER` | HTTP 200 no teste da rota |
| Typecheck | Sucesso |
| Lint | Sucesso; 13 avisos preexistentes |
| Testes | 70/70 |
| Build | Sucesso; 26 páginas |

## Limitação do ambiente local

O servidor Next.js não iniciou neste contêiner porque a chamada do sistema
`uv_interface_addresses` foi bloqueada antes de a aplicação atender requisições.
O build de produção concluiu normalmente. Por isso, o smoke HTTP será realizado
no preview da Vercel e não será simulado.

## Evidência ainda exigida

1. Preview com provedor demonstrativo presente somente quando configurado.
2. Login demonstrativo bem-sucedido com credencial não versionada.
3. Sessão contendo apenas papéis do vínculo local.
4. Smoke da busca CATMAT sem erro de autenticação ou autorização.

CI do PR: **aprovado no run 152**.

O preview foi construído com sucesso, mas permanece protegido pela autenticação
da Vercel. A conexão de automação deste Work não possui permissão para gerar um
link temporário de acesso e recebeu `403` ao listar o deployment. O bloqueio foi
preservado; a validação deve ser feita por uma sessão autorizada ou após ajuste
deliberado da política de proteção do preview.
