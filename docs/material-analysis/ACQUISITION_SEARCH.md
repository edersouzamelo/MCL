# Pesquisa de Instrumentos de Aquisição (ARP)

Após a confirmação do código do item no CATMAT, o gestor de logística pode buscar atas de registro de preços vigentes.

## Filtros de Busca
A busca de atas utiliza:
* **Item Code:** Filtro obrigatório derivado do CATMAT ativo.
* **Vigência:** Período inicial e final configurável (por padrão, do início ao fim do ano corrente).
* **Tipo de Item:** Fixado como `Material`.

## Consulta de Unidades e Limites
Ao abrir os detalhes de uma ata específica, o sistema consome os dados de unidades do Compras.gov.br. O MCL faz distinção estrita entre:
* **Quantidade Homologada:** A quantidade total registrada na assinatura da ata.
* **Quantidade Empenhada:** Quantidade que já possui empenho de crédito orçamentário.
* **Saldo Disponível:** Quantidade útil restante para contratação (adesão de participantes ou caronas).
* **Ausência de Saldo:** Exibido explicitamente como "Não fornecido pela fonte" em vez de ser mascarado como zero.
