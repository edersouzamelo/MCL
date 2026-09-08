# Threat Model

Ameaças consideradas:

- acesso indevido;
- elevação de privilégio;
- QR Code adulterado;
- replay de evento;
- duplicidade;
- importação maliciosa;
- comprometimento de conector;
- exposição de segredo;
- modificação de log;
- vazamento por exportação;
- prompt injection por usuário ou conteúdo recuperado no RAG;
- exfiltração de dados por ferramenta do Assistente;
- retenção ou treinamento do provedor com prompts operacionais;
- consumo descontrolado do AI Gateway;
- indisponibilidade de banco;
- falha de sincronização.

Controles: Auth.js, validação server-side, idempotência, token QR opaco, quarentena, CSP, ausência de segredos versionados e auditoria append-only.

Controles específicos da IA: rota autenticada, RBAC e escopo organizacional nas ferramentas; nenhuma ferramenta de escrita ou SQL arbitrário; exclusão de fontes `SIM-*` e organizações/itens sintéticos; resultados com proveniência e lacunas; instrução para tratar conteúdo recuperado como dado, não como comando; OIDC sem chave persistente; exigência de zero retenção e de não treinamento no Gateway; usuário pseudonimizado; limites de histórico, entrada, etapas, saída e tempo; falha fechada para autenticação, orçamento, rate limit e indisponibilidade.
