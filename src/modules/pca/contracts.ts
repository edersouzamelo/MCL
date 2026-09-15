export type PcaUnitOption = {
  id: string;
  name: string;
  uasg: string;
  type: string;
  superiorUasg: string | null;
  suggested: boolean;
  reason: "USER_ORGANIZATION" | "SUBORDINATE" | "OTHER";
};

export type PcaItemView = {
  id: string;
  year: number;
  itemNumber: number | null;
  catalogCode: string | null;
  catalogType: string | null;
  description: string;
  unit: string | null;
  estimatedQuantity: string | null;
  estimatedTotalValue: string | null;
  expectedContractingDate: string | null;
  category: string | null;
  sourceUrl: string | null;
  synchronizedAt: string;
};
