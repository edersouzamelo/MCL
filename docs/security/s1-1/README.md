# S1-1 — Autenticação e autorização fail-closed

Status: **IMPLEMENTADO E VALIDADO LOCALMENTE — AGUARDA GATE DE AMBIENTE**

- Data: 12 AGO 2026
- Baseline: `2d8a4d0d6faf69913e2342d6fa7d0e2577aa627a`
- Limite: lote mínimo de um dia

## Objetivo

Retirar padrões inseguros da autenticação demonstrativa do MCL sem implantar
uma arquitetura definitiva de identidade e sem alterar CATMAT, banco, RLS ou
interface além da comunicação de segurança no login.

Esta autenticação protege somente o protótipo. Não identifica oficialmente um
militar, não representa federação com o Exército Brasileiro e não atribui
competência administrativa.

## T0 confirmado

- `DEMO_AUTH_ENABLED` ligava o demo salvo negação explícita.
- Senha demonstrativa e segredo de sessão possuíam fallback versionado.
- A ausência de sessão podia produzir um ator demonstrativo com quatro papéis.
- Todo login recebia `ADMIN`, `LOGISTICS_MANAGER`, `WAREHOUSE_OPERATOR` e
  `AUDITOR`, independentemente do vínculo persistido.
- As tabelas `UserScope`, `Role` e `Membership` e os vínculos demonstrativos já
  existiam; não foi necessário criar um novo modelo de identidade.

## Mudança do lote

- Demo somente quando `DEMO_AUTH_ENABLED=true`, `AUTH_SECRET` está presente e
  `DEMO_USER_PASSWORD` possui pelo menos 12 caracteres.
- Remoção dos fallbacks de senha, segredo e ator sem sessão.
- Identidades sem usuário e escopo local ativos são negadas, inclusive OAuth.
- Papéis da sessão vêm dos `UserScope` ativos da organização vinculada.
- A confirmação e a revogação CATMAT respondem `403` antes da lógica de negócio
  para papéis diferentes de `ADMIN` e `LOGISTICS_MANAGER`.
- A tela declara que o acesso é local e não corresponde à identidade
  corporativa do Exército Brasileiro.
- Configuração local e E2E passou a exigir segredos fornecidos fora do código.

## Critérios de saída

- [x] Sem configuração segura, o demo permanece indisponível.
- [x] Nenhum segredo ou senha operacional permanece como fallback versionado.
- [x] Nenhuma sessão recebe quatro papéis universais.
- [x] Identidade sem vínculo local é negada.
- [x] Rota representativa prova `401`, `403` e sucesso autorizado.
- [x] Typecheck, lint, 68 testes e build passam localmente.
- [ ] Preview confirma que as variáveis exigidas existem no ambiente.
- [ ] Login e smoke HTTP autenticado passam no preview.
- [ ] CI do PR verde e lote integrado na `main`.

## Gate de ambiente antes do merge

O PR não deve ser mesclado se o preview não publicar o provedor demonstrativo
deliberadamente configurado. Conferir apenas a presença e o escopo das
variáveis; nunca registrar seus valores.

Variáveis mínimas para o fluxo demonstrativo:

```env
AUTH_SECRET=
DEMO_AUTH_ENABLED=true
DEMO_USER_PASSWORD=
```

Depois da demonstração, a senha deve ser rotacionada ou o demo desativado.

## Parada

Não ampliar este lote para matriz completa de rotas, federação institucional,
RLS, atualização de dependências ou correção semântica CATMAT. Esses trabalhos
permanecem em fases próprias.
