export type Class2CoverageReferenceItem = {
  itemKey: string;
  itemLabel: string;
  coveragePrdu: number;
  inPrdu: boolean;
};

export type Class2CoverageReferenceSnapshot = {
  title: string;
  updatedAt: string;
  stockPositionDate: string;
  prduReferenceYear: number;
  organizationScope: string;
  sourceNote: string;
  items: Class2CoverageReferenceItem[];
};

export const class2CoverageReferenceSnapshot: Class2CoverageReferenceSnapshot = {
  title: "Classe II · Duração dos estoques PRDU",
  updatedAt: "2026-09-01",
  stockPositionDate: "2026-07-31",
  prduReferenceYear: 2027,
  organizationScope: "9º Grupamento Logístico",
  sourceNote: "Snapshot de referência extraído do controle semanal Classe II. A cobertura expressa quantos PRDU o estoque disponível representa. A ingestão documental e a vinculação por identificador persistente ainda são etapas pendentes.",
  items: [
    { itemKey: "agasalho-tfm-vo", itemLabel: "Agasalho de TFM VO", coveragePrdu: 1.724179585, inPrdu: true },
    { itemKey: "bandeira-brasil", itemLabel: "Bandeira do Brasil", coveragePrdu: 0.9359664871, inPrdu: true },
    { itemKey: "bermuda-camuflada", itemLabel: "Bermuda Camuflada", coveragePrdu: 1.573718791, inPrdu: true },
    { itemKey: "blusa-combate", itemLabel: "Blusa de Combate", coveragePrdu: 0.995045045, inPrdu: true },
    { itemKey: "boina-azul-ferrete", itemLabel: "Boina Azul Ferrete", coveragePrdu: 0.1, inPrdu: true },
    { itemKey: "boina-azul-ultramar", itemLabel: "Boina Azul Ultramar", coveragePrdu: 5.965116279, inPrdu: true },
    { itemKey: "boina-preta", itemLabel: "Boina Preta", coveragePrdu: 0.3409836066, inPrdu: true },
    { itemKey: "boina-verde-oliva", itemLabel: "Boina Verde Oliva", coveragePrdu: 2.863470431, inPrdu: true },
    { itemKey: "botina-lona", itemLabel: "Botina de Lona", coveragePrdu: 1.085768916, inPrdu: true },
    { itemKey: "cachecol-vo", itemLabel: "Cachecol VO", coveragePrdu: 1.093394077, inPrdu: true },
    { itemKey: "calca-verde-oliva", itemLabel: "Calça Verde Oliva", coveragePrdu: 2.796116505, inPrdu: true },
    { itemKey: "calcao-banho-preto", itemLabel: "Calção de Banho Preto", coveragePrdu: 0.4316939891, inPrdu: true },
    { itemKey: "calcao-tfm-vo", itemLabel: "Calção TFM VO", coveragePrdu: 2.778367245, inPrdu: true },
    { itemKey: "calcao-tfm-lista-vermelha", itemLabel: "Calção TFM com lista vermelha", coveragePrdu: 0.4395348837, inPrdu: true },
    { itemKey: "camisa-bege-cp", itemLabel: "Camisa Bege Meia Manga C/P", coveragePrdu: 0.03174603175, inPrdu: true },
    { itemKey: "camisa-bege-sp", itemLabel: "Camisa Bege Meia Manga S/P", coveragePrdu: 2.525322741, inPrdu: true },
    { itemKey: "camiseta-tfm-branca", itemLabel: "Camiseta TFM Branca", coveragePrdu: 1.878529964, inPrdu: true },
    { itemKey: "camiseta-camuflada", itemLabel: "Camiseta Camuflada", coveragePrdu: 2.463873034, inPrdu: true },
    { itemKey: "chapeu-tropical", itemLabel: "Chapéu Tropical", coveragePrdu: 9.054054054, inPrdu: true },
    { itemKey: "cinto-nylon-vo", itemLabel: "Cinto de Nylon VO", coveragePrdu: 4.100384862, inPrdu: true },
    { itemKey: "conjunto-camuflado-tipo-ii", itemLabel: "Conjunto Camuflado Tipo II", coveragePrdu: 2.502749175, inPrdu: true },
    { itemKey: "conjunto-segunda-pele", itemLabel: "Conjunto Segunda Pele", coveragePrdu: 2.346598856, inPrdu: true },
    { itemKey: "coturno-preto", itemLabel: "Coturno Preto", coveragePrdu: 0.8302936631, inPrdu: true },
    { itemKey: "coturno-coyote", itemLabel: "Coturno Coyote", coveragePrdu: 2.382550336, inPrdu: true },
    { itemKey: "distintivo-boina-exercito", itemLabel: "Distintivo Boina Exército", coveragePrdu: 0.7936327459, inPrdu: true },
    { itemKey: "fivela-dourada", itemLabel: "Fivela Dourada", coveragePrdu: 1.673410405, inPrdu: true },
    { itemKey: "fivela-preta", itemLabel: "Fivela Preta", coveragePrdu: 1.047828477, inPrdu: true },
    { itemKey: "insignia-borracha-cb", itemLabel: "Insígnia de borracha Cb", coveragePrdu: 1.371461583, inPrdu: true },
    { itemKey: "insignia-borracha-sd", itemLabel: "Insígnia de borracha Sd", coveragePrdu: 0.9032378117, inPrdu: true },
    { itemKey: "gorro-selva", itemLabel: "Gorro de Selva", coveragePrdu: 0.7722422991, inPrdu: true },
    { itemKey: "japona-campanha", itemLabel: "Japona de Campanha", coveragePrdu: 0.4679897567, inPrdu: true },
    { itemKey: "macacao-cmb-camuflado", itemLabel: "Macacão Cmb Camuflado", coveragePrdu: 1.567505721, inPrdu: true },
    { itemKey: "meia-branca", itemLabel: "Meia Branca", coveragePrdu: 2.386482027, inPrdu: true },
    { itemKey: "meia-preta", itemLabel: "Meia Preta", coveragePrdu: 2.851145038, inPrdu: true },
    { itemKey: "meia-verde-oliva", itemLabel: "Meia Verde Oliva", coveragePrdu: 1.295613354, inPrdu: true },
    { itemKey: "sandalia-borracha", itemLabel: "Sandália de Borracha", coveragePrdu: 0.01035659645, inPrdu: true },
    { itemKey: "tenis-preto", itemLabel: "Tênis Preto", coveragePrdu: 1.086630622, inPrdu: true },
    { itemKey: "sapato-preto", itemLabel: "Sapato Preto", coveragePrdu: 3.853949329, inPrdu: true },
    { itemKey: "vestia-branca-rancho", itemLabel: "Véstia Branca Rancho", coveragePrdu: 0.7293133803, inPrdu: true },
    { itemKey: "vestia-branca-saude", itemLabel: "Véstia Branca Saúde", coveragePrdu: 0.399408284, inPrdu: true },
    { itemKey: "cobertor-azul", itemLabel: "Cobertor Azul", coveragePrdu: 4, inPrdu: true },
    { itemKey: "cobertor-verde-oliva", itemLabel: "Cobertor Verde Oliva", coveragePrdu: 1.16168717, inPrdu: true },
    { itemKey: "colcha-branca", itemLabel: "Colcha Branca", coveragePrdu: 3.585294118, inPrdu: true },
    { itemKey: "colcha-azul", itemLabel: "Colcha Azul", coveragePrdu: 1.250814332, inPrdu: true },
    { itemKey: "fronha-branca", itemLabel: "Fronha Branca", coveragePrdu: 2.07513369, inPrdu: true },
    { itemKey: "fronha-azul", itemLabel: "Fronha Azul", coveragePrdu: 3.661237785, inPrdu: true },
    { itemKey: "lencol-branco", itemLabel: "Lençol Branco", coveragePrdu: 0.3355614973, inPrdu: true },
    { itemKey: "lencol-azul", itemLabel: "Lençol Azul", coveragePrdu: 1.35504886, inPrdu: true },
    { itemKey: "toalha-banho", itemLabel: "Toalha de Banho", coveragePrdu: 1.360515524, inPrdu: true },
    { itemKey: "toalha-rosto", itemLabel: "Toalha de Rosto", coveragePrdu: 2.392638037, inPrdu: true },
    { itemKey: "bermuda-preta-seg-fem", itemLabel: "Bermuda preta (Seg Fem)", coveragePrdu: 0.2725, inPrdu: false },
    { itemKey: "bustie-seg-fem", itemLabel: "Bustiê (Seg Fem)", coveragePrdu: 0.2875, inPrdu: false },
  ],
};
