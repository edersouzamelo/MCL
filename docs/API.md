# API

## POST `/api/qr/resolve`

Resolve `MCL:UL:<token>` ou URL controlada.

## GET `/api/qr/[token]`

Gera PNG do QR Code contendo apenas `MCL:UL:<token>`.

## POST `/api/events`

Cria evento logístico autenticado, valida payload, aplica idempotência e recalcula projeção.

## POST `/api/import`

Valida CSV/JSON sintético; registros inválidos vão para quarentena.
