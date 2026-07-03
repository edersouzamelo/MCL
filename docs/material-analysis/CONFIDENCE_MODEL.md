# Modelo de Confiança Determinístico da Análise

O MCL avalia a confiança de cada análise de cobertura gerando um score de 0% a 100%. Este cálculo baseia-se em parâmetros lógicos mensuráveis obtidos das fontes governamentais e interações dos usuários, sem qualquer opacidade ou processamento por modelos de linguagem (LLM).

## Fórmula de Confiança
A confiança $C$ é calculada da seguinte forma:

$$C = \max(0, \min(1, 0.35 + W_{map} \times 0.3 + F_{ata} + F_{saldo} - F_{financ} - F_{div}))$$

Onde:
1. **Confiança do Mapeamento ($W_{map}$):** Similaridade textual calculada ou a confiança atribuída pelo operador ao confirmar o CATMAT (valor padrão: 0.85).
2. **Presença de Atas Vigentes ($F_{ata}$):** Recebe $+0.18$ se houver pelo menos uma ata de registro de preços vigente correlacionada ao CATMAT confirmado.
3. **Saldo Consultável ($F_{saldo}$):** Recebe $+0.12$ se as unidades participantes retornarem informações explícitas de saldos ou limites da fonte do Compras.gov.br.
4. **Ausência de Informações Financeiras ($F_{financ}$):** Deduz $-0.05$ se houver atas vigentes onde os valores unitários ou totais não foram retornados pela API oficial.
5. **Divergências de Código ($F_{div}$):** Deduz $-0.08$ por cada ata associada onde o código do material divergir do código do CATMAT confirmado (por exemplo, atas de PDMs similares cadastradas incorretamente).
