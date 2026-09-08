import { legacyFinancialApiDisabled } from "@/modules/financial-snapshots/legacy-api";
export async function GET() { return legacyFinancialApiDisabled(); }
