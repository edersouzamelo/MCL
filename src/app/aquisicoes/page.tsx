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
      persistentCode: need.persistentCode,
      itemName: item?.name ?? "item",
      variantLabel: variant?.size ?? variant?.label ?? "",
      quantity: need.quantityApproved ?? need.quantityRequested,
      status: need.status,
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
        title="Aquisições"
        description="Consulta CATMAT, confirmação humana, atas e ARP, unidades e saldos, síntese de cobertura e instrumentos vinculados."
        action={<InlineLink href="/conectores">Abrir conectores</InlineLink>}
      />

      <Card className="mb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">
              Fluxo de obtenção recuperado
            </p>
            <h2 className="mt-1 text-xl font-semibold">CATMAT, atas e cobertura orientada pela necessidade</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              O fluxo preserva a sequência operacional do MCL: pesquisar o CATMAT, confirmar humanamente o item,
              consultar atas vigentes, verificar unidades e saldos retornados pela fonte e registrar a possibilidade de cobertura.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <InlineLink href="/catalogo">Pesquisar CATMAT</InlineLink>
            <InlineLink href="/necessidades">Abrir necessidades</InlineLink>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <span className="text-xs font-semibold text-zinc-500">01</span>
            <h3 className="mt-1 font-semibold">CATMAT</h3>
            <p className="mt-1 text-xs leading-5 text-zinc-500">Busca no catálogo oficial e seleção de candidato.</p>
          </div>
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <span className="text-xs font-semibold text-zinc-500">02</span>
            <h3 className="mt-1 font-semibold">Confirmação humana</h3>
            <p className="mt-1 text-xs leading-5 text-zinc-500">O candidato só vira mapeamento após confirmação intencional.</p>
          </div>
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <span className="text-xs font-semibold text-zinc-500">03</span>
            <h3 className="mt-1 font-semibold">Atas e ARP</h3>
            <p className="mt-1 text-xs leading-5 text-zinc-500">Consulta atas vigentes somente para o CATMAT confirmado.</p>
          </div>
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <span className="text-xs font-semibold text-zinc-500">04</span>
            <h3 className="mt-1 font-semibold">Unidades e saldos</h3>
            <p className="mt-1 text-xs leading-5 text-zinc-500">Exibe a resposta da fonte e a síntese determinística de cobertura.</p>
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Retomar busca por necessidade</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Escolha uma necessidade para abrir diretamente o fluxo CATMAT, ARP e cobertura.
            </p>
          </div>
          <Badge tone="info">{needs.length} necessidades</Badge>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {needs.map((need) => (
            <div key={need.id} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-zinc-500">{need.persistentCode}</p>
                  <h3 className="mt-1 font-semibold">{need.itemName}</h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    {need.variantLabel || "sem variante"} · quantidade {need.quantity}
                  </p>
                </div>
                <Badge tone="neutral">{need.status}</Badge>
              </div>
              <div className="mt-4">
                <InlineLink href={`/necessidades/${need.id}/buscar-cobertura`}>Buscar cobertura</InlineLink>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-4">
        <h2 className="text-lg font-semibold">Vínculo manual para piloto</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          O vínculo indica potencial atendimento e depende de validação humana. Ele não afirma aplicabilidade operacional.
        </p>
        <div className="mt-4">
          <AcquisitionLinkForm
            needs={needs.map(({ id, label }) => ({ id, label }))}
            instruments={publicInstrumentOptions}
          />
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Instrumentos de aquisição registrados</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Dados públicos coletados do Compras.gov.br e registros do piloto, sempre com origem identificada.
            </p>
          </div>
          <Badge tone="neutral">{state.acquisitionInstruments.length} registros</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <tr>
                <th className="py-2">Referência</th>
                <th>Origem</th>
                <th>Vigência</th>
                <th>Situação</th>
                <th>Fornecedor</th>
                <th>Item</th>
                <th>Quantidade</th>
                <th>Valor</th>
                <th>Atualização</th>
                <th>Confiança</th>
                <th>Vínculos</th>
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
                  <tr key={instrument.id} className="border-b border-zinc-100 align-top dark:border-zinc-900">
                    <td className="py-3">
                      <p className="font-semibold">{instrument.reference}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{instrument.externalReference ?? instrument.sourceRecordId}</p>
                    </td>
                    <td><Badge tone={originTone(origin, instrument.sourceSystem === "SIM-AQUISICAO")}>{origin}</Badge></td>
                    <td>{formatOptionalDate(instrument.validFrom)}<br />{formatOptionalDate(instrument.validUntil)}</td>
                    <td>{instrument.status}</td>
                    <td>{instrument.supplierName ?? instrument.supplierNameSynthetic ?? "nao fornecido"}</td>
                    <td>
                      <p>{instrument.itemCode ?? "nao fornecido"}</p>
                      <p className="max-w-xs text-xs text-zinc-600 dark:text-zinc-400">{instrument.itemDescription ?? "Item sintetico do piloto"}</p>
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
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">{link.justification ?? "sem justificativa"}</p>
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
