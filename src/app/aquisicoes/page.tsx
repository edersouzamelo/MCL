import { AppShell } from "@/components/AppShell";
import { AcquisitionLinkForm } from "@/components/AcquisitionLinkForm";
import { Badge, Card, InlineLink, PageHeader, formatDateTime } from "@/components/ui";
import { itemForVariant } from "@/modules/demo/selectors";
import { getDemoState } from "@/server/demo-store";

export const dynamic = "force-dynamic";

function formatOptionalDate(value?: string) {
  return value ? formatDateTime(value) : "nao fornecido";
}

function formatMoney(value?: number) {
  return value == null
    ? "nao fornecido"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function originTone(origin?: string, synthetic?: boolean): "neutral" | "good" | "warn" | "info" {
  if (origin === "PUBLICO") {
    return "good";
  }
  if (origin === "MANUAL") {
    return "warn";
  }
  if (synthetic) {
    return "info";
  }
  return "neutral";
}

export default function AcquisitionsPage() {
  const state = getDemoState();
  const publicInstruments = state.acquisitionInstruments.filter((instrument) => instrument.sourceSystem === "COMPRAS_GOV");
  const needs = state.needs.map((need) => {
    const { item, variant } = itemForVariant(state, need.itemVariantId);
    return {
      id: need.id,
      label: `${need.persistentCode} - ${item?.name ?? "item"} ${variant?.size ?? ""}`.trim(),
    };
  });
  const publicInstrumentOptions = publicInstruments.map((instrument) => ({
    id: instrument.id,
    label: `${instrument.reference} - ${instrument.itemCode ?? "sem CATMAT"} - ${instrument.supplierName ?? "fornecedor nao fornecido"}`,
  }));

  return (
    <AppShell>
      <PageHeader
        title="Aquisicoes"
        description="Instrumentos sinteticos e dados publicos coletados do Compras.gov.br com origem, vigencia e vinculos manuais."
        action={<InlineLink href="/conectores">Abrir conectores</InlineLink>}
      />

      <Card className="mb-4">
        <h2 className="text-lg font-semibold">Vinculo manual para piloto</h2>
        <p className="mt-1 text-sm text-zinc-600">
          O vinculo indica potencial atendimento e depende de validacao humana; ele nao afirma aplicabilidade operacional.
        </p>
        <div className="mt-4">
          <AcquisitionLinkForm needs={needs} instruments={publicInstrumentOptions} />
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
              <tr>
                <th className="py-2">Referencia</th>
                <th>Origem</th>
                <th>Vigencia</th>
                <th>Situacao</th>
                <th>Fornecedor</th>
                <th>Item</th>
                <th>Quantidade</th>
                <th>Valor</th>
                <th>Atualizacao</th>
                <th>Confianca</th>
                <th>Vinculos</th>
              </tr>
            </thead>
            <tbody>
              {state.acquisitionInstruments.map((instrument) => {
                const links = state.objectLinks.filter(
                  (link) =>
                    link.fromType === "NEED" &&
                    link.toType === "ACQUISITION_INSTRUMENT" &&
                    link.toId === instrument.id &&
                    link.relationType === "PODE_SER_ATENDIDA_POR",
                );
                const origin = instrument.sourceOrigin ?? (instrument.sourceSystem === "SIM-AQUISICAO" ? "SINTETICO" : "PUBLICO");
                return (
                  <tr key={instrument.id} className="border-b border-zinc-100 align-top">
                    <td className="py-3">
                      <p className="font-semibold">{instrument.reference}</p>
                      <p className="text-xs text-zinc-500">{instrument.externalReference ?? instrument.sourceRecordId}</p>
                    </td>
                    <td><Badge tone={originTone(origin, instrument.sourceSystem === "SIM-AQUISICAO")}>{origin}</Badge></td>
                    <td>{formatOptionalDate(instrument.validFrom)}<br />{formatOptionalDate(instrument.validUntil)}</td>
                    <td>{instrument.status}</td>
                    <td>{instrument.supplierName ?? instrument.supplierNameSynthetic ?? "nao fornecido"}</td>
                    <td>
                      <p>{instrument.itemCode ?? "nao fornecido"}</p>
                      <p className="max-w-xs text-xs text-zinc-600">{instrument.itemDescription ?? "Item sintetico do piloto"}</p>
                    </td>
                    <td>{instrument.quantity ?? instrument.capacity ?? "nao fornecido"}</td>
                    <td>{formatMoney(instrument.totalValue)}</td>
                    <td>{formatOptionalDate(instrument.lastSourceUpdateAt)}</td>
                    <td>{instrument.confidence == null ? "nao fornecida" : `${Math.round(instrument.confidence * 100)}%`}</td>
                    <td>
                      {links.length ? (
                        <ul className="space-y-1">
                          {links.map((link) => (
                            <li key={link.id}>
                              <InlineLink href={`/necessidades/${link.fromId}`}>{link.fromId}</InlineLink>
                              <p className="text-xs text-zinc-500">{link.justification ?? "sem justificativa"}</p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        "sem vinculo"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
