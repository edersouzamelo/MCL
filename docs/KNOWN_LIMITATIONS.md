# Limitações Conhecidas

- O store padrão é em memória; reiniciar o processo restaura o seed.
- Conectores legados sao simulados; Compras.gov.br e real, publico, somente leitura e ainda usa store em memoria no runtime atual.
- OAuth real depende de variáveis e callbacks externos.
- PostgreSQL requer configuração de `DATABASE_URL` e migração.
- Dados sincronizados do Compras.gov.br persistem somente enquanto o processo atual estiver vivo, ate PostgreSQL ser conectado.
- Modo offline avançado com fila IndexedDB é objetivo M1.
- Análise multicritério usa pesos demonstrativos pendentes de aprovação.
- Camada cognitiva é apenas contrato somente leitura.
