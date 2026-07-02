# Modelo de Autorização

Papéis:

- `COMMAND_VIEWER`: leitura executiva.
- `LOGISTICS_MANAGER`: leitura e registro operacional.
- `WAREHOUSE_OPERATOR`: registro de eventos de armazém.
- `AUDITOR`: leitura de auditoria.
- `ADMIN`: administração demonstrativa.
- `READ_ONLY`: leitura limitada.

Na v0.1.0, `src/modules/events/service.ts` bloqueia criação de evento para `READ_ONLY`.
