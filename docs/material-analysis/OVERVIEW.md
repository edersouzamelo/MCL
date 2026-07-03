# Visão Geral - Módulo de Análise de Cobertura de Materiais

O módulo de **Análise de Cobertura de Materiais** do MCL automatiza a correlação determinística entre as necessidades de fardamento Classe II cadastradas e a disponibilidade de atas de registro de preços vigentes da API oficial do Compras.gov.br.

## Fluxo Geral
A jornada permite que gestores de logística verifiquem déficits de estoque de qualquer material cadastrado (não restrito a coturnos) e busquem instrumentos de aquisições viáveis sem precisar realizar buscas manuais externas.

1. **Seleção de Necessidade:** Gestor acessa a necessidade em `/analises/materiais` e confere a demanda aprovada e o estoque livre atual.
2. **Definição de Déficit:** O déficit é calculado deterministicamente pela diferença entre a quantidade aprovada e o estoque coberto.
3. **Mapeamento CATMAT:** Busca dinâmica de candidatos baseada no nome/variante do material no Compras.gov.br, com confirmação humana obrigatória.
4. **Consulta de Atas:** Busca de Atas de Registro de Preço (ARP) vigentes no intervalo de data indicado usando o CATMAT confirmado.
5. **Consulta de Unidades & Saldos:** Leitura dos órgãos participantes e respectivos limites disponíveis nas atas de registro de preço selecionadas.
6. **Síntese de Cobertura:** Compilação lógica das capacidades potenciais e saldos das atas vs deficit de material.
7. **Rastro de Execução:** Histórico transparente exibindo endpoints, parâmetros enviados e tempos de resposta do conector.
