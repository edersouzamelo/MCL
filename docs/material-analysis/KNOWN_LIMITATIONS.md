# Limitações Conhecidas do Sistema

Este documento descreve os limites de escopo e restrições técnicas do módulo de análise de cobertura atual.

## Limitações Tecnológicas
1. **Dados Incompletos da API Pública:** O Compras.gov.br ocasionalmente não retorna campos específicos de saldos restantes, limites de adesões ou identificadores públicos de fornecedores (como CNPJ). O MCL não estima ou infere esses valores, exibindo explicitamente que a informação está ausente na origem.
2. **Dependência de Cache e Rede:** A lentidão ou indisponibilidade dos serviços do governo federal impactam o tempo de resposta da jornada. O conector possui limites configuráveis de timeout e tentativas de requisição para mitigar falhas completas.
3. **Decisão Humana Obrigatória:** O MCL não realiza contratações automáticas, não empenha despesas orçamentárias e não decide a legalidade jurídica de adesões a atas caronas. Toda ação de cobertura indica apenas viabilidade analítica, exigindo atos administrativos do gestor de logística.
