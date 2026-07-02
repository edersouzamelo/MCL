import Image from "next/image";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EventCaptureForm } from "@/components/EventCaptureForm";
import { Badge, Card, InlineLink, PageHeader, SourceStamp, Timeline, formatDateTime } from "@/components/ui";
import { passportForUnit } from "@/modules/demo/selectors";
import { appendAuditLog, findUnitByQrToken, getDemoState } from "@/server/demo-store";

export const dynamic = "force-dynamic";

export default async function UnitPassportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const state = getDemoState();
  const unit = findUnitByQrToken(token);
  if (!unit) {
    notFound();
  }
  appendAuditLog({
    actorId: "user-demo-admin",
    action: "CONSULTA_PASSAPORTE",
    resourceType: "LOGISTICS_UNIT",
    resourceId: unit.id,
    organizationId: "org-provedor-alfa",
    outcome: "SUCESSO",
    reason: "Passaporte digital consultado.",
    metadata: { qrToken: unit.qrToken },
  });
  const passport = passportForUnit(state, unit);

  return (
    <AppShell>
      <PageHeader
        title={`Passaporte digital ${unit.persistentCode}`}
        description="Trajetoria consolidada da unidade logististica com origem, confianca, divergencias e eventos append-only."
        action={<InlineLink href={`/etiquetas/${unit.qrToken}`}>Etiqueta imprimivel</InlineLink>}
      />
      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          <Card>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Image
                src={`/api/qr/${unit.qrToken}`}
                alt={`QR Code da unidade ${unit.persistentCode}`}
                width={160}
                height={160}
                className="rounded border border-zinc-200"
                unoptimized
              />
              <div>
                <Badge tone={passport.projection.alerts.length ? "warn" : "good"}>{passport.projection.state}</Badge>
                <h2 className="mt-3 text-xl font-semibold">{passport.item?.name}</h2>
                <p className="text-sm text-zinc-600">{passport.variant?.label}</p>
                <p className="mt-2 text-sm">QR: <code>MCL:UL:{unit.qrToken}</code></p>
                <p className="text-sm">Atualizado em {formatDateTime(passport.projection.updatedAt)}</p>
              </div>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded bg-zinc-50 p-3"><dt>Lote</dt><dd className="font-semibold">{passport.lot?.persistentCode}</dd></div>
              <div className="rounded bg-zinc-50 p-3"><dt>Quantidade</dt><dd className="font-semibold">{unit.quantity} {unit.unit}</dd></div>
              <div className="rounded bg-zinc-50 p-3"><dt>Condicao</dt><dd className="font-semibold">{passport.projection.condition}</dd></div>
              <div className="rounded bg-zinc-50 p-3"><dt>Localizacao</dt><dd className="font-semibold">{passport.location?.name}</dd></div>
              <div className="rounded bg-zinc-50 p-3"><dt>Organizacao</dt><dd className="font-semibold">{passport.organization?.name}</dd></div>
              <div className="rounded bg-zinc-50 p-3"><dt>Confianca</dt><dd className="font-semibold">{Math.round(passport.projection.confidence * 100)}%</dd></div>
            </dl>
            <div className="mt-4">
              <SourceStamp source={unit} />
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-lg font-semibold">Vinculos administrativos</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt>Necessidade</dt><dd>{passport.need ? <InlineLink href={`/necessidades/${passport.need.id}`}>{passport.need.persistentCode}</InlineLink> : "Nao vinculada"}</dd></div>
              <div className="flex justify-between gap-3"><dt>Credito</dt><dd>{passport.credit?.persistentCode ?? "Nao vinculado"}</dd></div>
              <div className="flex justify-between gap-3"><dt>Instrumento</dt><dd>{passport.instrument?.reference ?? "Nao vinculado"}</dd></div>
              <div className="flex justify-between gap-3"><dt>Empenho</dt><dd>{passport.commitment?.persistentCode ?? "Nao vinculado"}</dd></div>
              <div className="flex justify-between gap-3"><dt>Remessa</dt><dd>{passport.shipment?.persistentCode ?? "Nao vinculada"}</dd></div>
            </dl>
          </Card>

          <Card>
            <h2 className="mb-3 text-lg font-semibold">Registrar evento</h2>
            <EventCaptureForm unit={unit} locations={state.locations} />
          </Card>
        </div>
        <div className="space-y-4">
          {passport.projection.alerts.length ? (
            <Card>
              <h2 className="mb-2 text-lg font-semibold">Alertas de projecao</h2>
              <ul className="space-y-2 text-sm text-amber-900">
                {passport.projection.alerts.map((alert) => <li key={alert}>{alert}</li>)}
              </ul>
            </Card>
          ) : null}
          <Card>
            <h2 className="mb-3 text-lg font-semibold">Linha do tempo completa</h2>
            <Timeline events={passport.timeline} />
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
