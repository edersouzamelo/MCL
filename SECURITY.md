# Segurança

Este repositório não deve conter segredos. Use `.env` local e variáveis seguras na Vercel.

Medidas implementadas na v0.1.0:

- validação server-side com Zod;
- autorização server-side para criação de eventos;
- Auth.js/NextAuth com modo demonstrativo e OAuth configurável;
- cabeçalhos `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` e CSP;
- QR Code com token opaco, sem histórico embutido;
- idempotência de eventos;
- importação CSV/JSON com limite de tamanho e quarentena;
- sanitização básica contra CSV injection;
- auditoria append-only demonstrativa.

Reporte problemas sem expor dados reais ou credenciais.
