# Regras de Cálculo de Cobertura e Déficit

A cobertura de necessidades no MCL é calculada deterministicamente a partir de dados reais de estoque físico e aquisições vinculadas.

## Fórmula de Déficit
O déficit é definido pela quantidade da necessidade aprovada que não pode ser atendida pelo estoque livre atual:

$$\text{déficit} = \max(0, \text{quantidade aprovada} - \text{estoque livre utilitário})$$

* **Estoque Livre Utilitário:** Quantidade do item no inventário físico do depósito da organização que está no estado `DISPONIVEL` ou `ARMAZENADO` e não foi reservado para nenhuma outra necessidade logística pendente.
* **Capacidade Potencial:** A quantidade total disponível nas atas de registro de preços vigentes associadas ao CATMAT confirmado. Esta capacidade potencial **não** é deduzida automaticamente do déficit, servindo apenas como um indicador de viabilidade administrativa que requer validação humana.
