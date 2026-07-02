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
- prompt injection futura em RAG;
- indisponibilidade de banco;
- falha de sincronização.

Controles: Auth.js, validação server-side, idempotência, token QR opaco, quarentena, CSP, ausência de segredos versionados e auditoria append-only.
