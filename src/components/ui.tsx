import Link from "next/link";
import { clsx } from "clsx";
import type { LogisticsEvent, SourceMetadata } from "@/modules/domain/types";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-950">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-600">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={clsx("rounded border border-zinc-200 bg-white p-4 shadow-sm", className)}>{children}</section>;
}

export function MetricCard({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const color = {
    neutral: "border-zinc-200",
    good: "border-emerald-500",
    warn: "border-amber-500",
    bad: "border-rose-500",
  }[tone];

  return (
    <Card className={clsx("border-l-4", color)}>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-zinc-950">{value}</p>
      <p className="mt-1 text-sm text-zinc-600">{detail}</p>
    </Card>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "info" }) {
  const color = {
    neutral: "bg-zinc-100 text-zinc-700",
    good: "bg-emerald-100 text-emerald-800",
    warn: "bg-amber-100 text-amber-900",
    bad: "bg-rose-100 text-rose-800",
    info: "bg-sky-100 text-sky-800",
  }[tone];
  return <span className={clsx("inline-flex rounded px-2 py-1 text-xs font-semibold", color)}>{children}</span>;
}

export function SourceStamp({ source }: { source: SourceMetadata }) {
  return (
    <dl className="grid gap-2 rounded bg-zinc-50 p-3 text-xs text-zinc-600 sm:grid-cols-3">
      <div>
        <dt className="font-semibold text-zinc-800">Fonte</dt>
        <dd>{source.sourceSystem}</dd>
      </div>
      <div>
        <dt className="font-semibold text-zinc-800">Registro</dt>
        <dd>{source.sourceRecordId}</dd>
      </div>
      <div>
        <dt className="font-semibold text-zinc-800">Confianca</dt>
        <dd>{Math.round(source.confidence * 100)}%</dd>
      </div>
      <div>
        <dt className="font-semibold text-zinc-800">Ocorrencia</dt>
        <dd>{formatDateTime(source.occurredAt)}</dd>
      </div>
      <div>
        <dt className="font-semibold text-zinc-800">Registro MCL</dt>
        <dd>{formatDateTime(source.recordedAt)}</dd>
      </div>
      <div>
        <dt className="font-semibold text-zinc-800">Natureza</dt>
        <dd>{source.dataNature}</dd>
      </div>
    </dl>
  );
}

export function Timeline({ events }: { events: LogisticsEvent[] }) {
  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <li key={event.id} className="rounded border border-zinc-200 bg-white p-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-semibold text-zinc-900">{event.eventType.replaceAll("_", " ")}</p>
              <p className="text-sm text-zinc-600">{event.persistentCode}</p>
            </div>
            <Badge tone={event.dataNature === "divergente" ? "bad" : "info"}>{event.dataNature}</Badge>
          </div>
          <p className="mt-2 text-sm text-zinc-700">
            {formatDateTime(event.occurredAt)} - fonte {event.sourceSystem}, confianca {Math.round(event.confidence * 100)}%
          </p>
          {event.condition ? <p className="mt-1 text-sm text-zinc-600">Condicao: {event.condition}</p> : null}
        </li>
      ))}
    </ol>
  );
}

export function InlineLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-emerald-800 underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Cuiaba",
  }).format(new Date(value));
}
