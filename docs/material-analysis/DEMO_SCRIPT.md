# Roteiro de Demonstração (Cinco Minutos)

Este guia orienta o operador na realização de uma apresentação executiva do módulo de Análise de Cobertura de Materiais em 5 minutos.

## Cronograma

### Minuto 1: Seleção de Necessidade e Identificação de Déficit
1. Acesse o Painel Geral em `/painel`.
2. Mostre o indicador de necessidades aguardando análise e clique em **Abrir Análise** para a necessidade de **Coturno operacional nº 42** (`MCL-NEC-2026-0001`).
3. Destaque o cabeçalho exibindo os dados da necessidade, a organização de origem, a quantidade solicitada de 200 pares, o estoque coberto de 120 pares e o **déficit de 80 pares**.

### Minuto 2: Pesquisa e Correlação CATMAT
1. Na seção **Pesquisa CATMAT**, clique em **Buscar CATMAT**.
2. Mostre que o MCL realiza a busca em tempo real no catálogo do Compras.gov.br.
3. Exiba os candidatos listados por similaridade textual determinística.
4. Digite a justificativa de correlação e clique em **Confirmar CATMAT** para vincular o código oficial ao item interno.

### Minuto 3: Consulta de Atas Relacionadas
1. Com o CATMAT ativo, vá para a seção de **Atas relacionadas**.
2. Defina o período de vigência e clique em **Consultar Atas**.
3. Mostre a lista de atas de registro de preços vigentes identificadas para o material selecionado, evidenciando que o conector lê dados diretamente da fonte pública.

### Minuto 4: Unidades Participantes, Saldos e Síntese
1. Selecione uma ata vigente e clique em **Consultar Unidades**.
2. Exiba a tabela detalhando quais unidades militares possuem cota de participação ou limite de adesão na ata, ressaltando a diferenciação clara entre quantidade homologada e saldos.
3. Mostre a **Síntese Determinística** consolidando o déficit, a capacidade potencial, os valores unitários observados e a confiança final calculada.

### Minuto 5: Generalização do Módulo com Outro Material
1. Retorne para a listagem geral em `/analises/materiais`.
2. Selecione a necessidade de **Gandola M** (`MCL-NEC-2026-0002`).
3. Demonstre que a mesma interface e os mesmos componentes executam a busca e o fluxo completo para as gandolas, provando que o módulo é totalmente genérico e reutilizável para qualquer material cadastrado.
4. Conclua mostrando que as análises persistidas podem ser recarregadas mantendo o histórico intacto.
