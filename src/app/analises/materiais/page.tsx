import { AppShell } from "@/components/AppShell";
import { Badge, Card, PageHeader } from "@/components/ui";
import Link from "next/link";
import { itemForVariant, organizationName } from "@/modules/demo/selectors";
import { projectNeed } from "@/modules/events/projection";
import { getDemoState } from "@/server/demo-store";
import { prisma } from "@/server/db";
import { persistenceMode } from "@/modules/coverage/service";

export const dynamic = "force-dynamic";

interface MaterialNeedItem {
  id: string;
  persistentCode: string;
  itemName: string;
  variantLabel: string;
  size: string;
  orgName: string;
  quantityRequested: number;
  quantityApproved: number;
  stockCovered: number;
  deficit: number;
  priority: string;
  requiredAt: string;
  analysisStatus: string;
}

export default async function MaterialAnalysesPage() {
  let isPostgres = persistenceMode() === "postgresql";
  let items: MaterialNeedItem[] = [];

  if (isPostgres) {
    try {
      const dbNeeds = await prisma.need.findMany({
        include: {
          variant: {
            include: {
              item: true,
            },
          },
        },
      });

      const dbOrganizations = await prisma.organization.findMany();
      const dbCoverages = await prisma.needCoverage.findMany();
      const dbAnalyses = await prisma.materialCoverageAnalysis.findMany();

    items = dbNeeds.map((need: (typeof dbNeeds)[number]) => {
      const org = dbOrganizations.find((o: (typeof dbOrganizations)[number]) => o.id === need.organizationId);
      const coverages = dbCoverages.filter(
        (coverage: (typeof dbCoverages)[number]) => coverage.needId === need.id && coverage.coverageType === "ESTOQUE",
      );
      const stockCovered = coverages.reduce((sum: number, coverage: (typeof coverages)[number]) => sum + coverage.quantity, 0);
      const deficit = Math.max(0, need.quantityRequested - stockCovered);
      const analysis = dbAnalyses.find((candidate: (typeof dbAnalyses)[number]) => candidate.needId === need.id);

      let statusLabel = "Aguardando Analise";
      if (analysis) {
        if (analysis.status === "COMPLETED") statusLabel = "Concluido";
        else if (analysis.status === "PARTIAL_RESULTS") statusLabel = "Resultados Parciais";
        else if (analysis.status === "SEARCHING_ACQUISITIONS") statusLabel = "Ata Confirmada";
        else if (analysis.status === "AWAITING_MAPPING_CONFIRMATION") statusLabel = "Aguardando Confirmacao CATMAT";
      }

      return {
        id: need.id,
        persistentCode: need.persistentCode,
        itemName: need.variant.item.name,
        variantLabel: need.variant.label,
        size: need.variant.size,
        orgName: org?.name ?? need.organizationId,
        quantityRequested: need.quantityRequested,
        quantityApproved: need.quantityApproved,
        stockCovered,
        deficit,
        priority: need.priority,
        requiredAt: need.requiredAt.toISOString(),
        analysisStatus: statusLabel,
      };
      });
    } catch (error) {
      console.error("Database query failed on materials page, falling back to memory:", error);
      isPostgres = false;
    }
  }

  if (!isPostgres) {
    // Falling back to demo state in memory
    const state = getDemoState();
    items = state.needs.map((need) => {
      const { item, variant } = itemForVariant(state, need.itemVariantId);
      const projection = projectNeed(need, state);
      const deficit = Math.max(0, need.quantityRequested - projection.totalCovered);
      const mapping = state.itemCatalogMappings.find((m) => m.needId === need.id && m.status === "ACTIVE");

      let statusLabel = "Aguardando Analise";
      if (mapping) {
        statusLabel = "CATMAT Confirmado";
      }

      return {
        id: need.id,
        persistentCode: need.persistentCode,
        itemName: item?.name ?? "Material desconhecido",
        variantLabel: variant?.label ?? "",
        size: variant?.size ?? "",
        orgName: organizationName(state, need.organizationId),
        quantityRequested: need.quantityRequested,
        quantityApproved: need.quantityApproved,
        stockCovered: projection.totalCovered - deficit, // estimated stock
        deficit: Math.max(0, need.quantityRequested - projection.totalCovered),
        priority: need.priority,
        requiredAt: typeof need.requiredAt === "string" ? need.requiredAt : (need.requiredAt as Date).toISOString(),
        analysisStatus: statusLabel,
      };
    });
  }

  return (
    <AppShell>
      <PageHeader
        title="Analise de Cobertura de Materiais"
        description="Mapeie necessidades logisticas para fardamento Classe II, correlacione com candidatos CATMAT da API publica Compras.gov.br e consulte atas e saldos disponiveis."
      />

      <div className="grid gap-4 mt-6">
        {items.map((item) => (
          <Card key={item.id}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded">
                    {item.persistentCode}
                  </span>
                  <Badge tone={item.priority === "ALTA" ? "warn" : "neutral"}>
                    {item.priority}
                  </Badge>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Prazo: {new Date(item.requiredAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <h2 className="mt-2 text-xl font-bold text-zinc-900">
                  {item.itemName} - {item.variantLabel} (Tam: {item.size})
                </h2>
                <p className="text-sm text-zinc-600 mt-1">
                  Demandante: <strong className="text-zinc-800">{item.orgName}</strong>
                </p>

                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 text-xs text-zinc-600 border border-zinc-100">
                  <div>
                    Solicitado: <strong className="block text-sm text-zinc-900 mt-0.5">{item.quantityRequested}</strong>
                  </div>
                  <div>
                    Aprovado: <strong className="block text-sm text-zinc-900 mt-0.5">{item.quantityApproved}</strong>
                  </div>
                  <div>
                    Estoque livre/reservado: <strong className="block text-sm text-zinc-900 mt-0.5">{item.stockCovered}</strong>
                  </div>
                  <div>
                    Deficit calculado: <strong className="block text-sm text-red-600 mt-0.5">{item.deficit}</strong>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-stretch gap-2 md:items-end w-full md:w-auto">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 px-2.5 py-1 rounded text-center">
                  Status: {item.analysisStatus}
                </span>
                <Link
                  href={`/necessidades/${item.id}/buscar-cobertura`}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm text-center py-2 px-4 rounded shadow-sm hover:shadow transition-all block w-full md:w-auto"
                >
                  ABRIR CATMAT E ATAS
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
