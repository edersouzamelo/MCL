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
    <div className="mb-8 border-b border-zinc-200 dark:border-zinc-800 pb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">{title}</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{description}</p>
      </div>
      {action && <div className="shrink-0 flex items-center">{action}</div>}
    </div>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={clsx(
      "rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-5 shadow-sm hover:shadow-md transition-all duration-200",
      className
    )}>
      {children}
    </section>
  );
}

export function OperationalSurface({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx(
      "rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/40 backdrop-blur-md p-6 shadow-md shadow-zinc-100/50 dark:shadow-none",
      className
    )}>
      {children}
    </div>
  );
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
    neutral: "border-zinc-200 dark:border-zinc-800",
    good: "border-emerald-500/80 dark:border-emerald-500/55",
    warn: "border-amber-500/80 dark:border-amber-500/55",
    bad: "border-rose-500/80 dark:border-rose-500/55",
  }[tone];

  return (
    <Card className={clsx("border-l-4", color)}>
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-zinc-950 dark:text-zinc-50">{value}</p>
      <p className="mt-1 text-sm text-zinc-650 dark:text-zinc-400">{detail}</p>
    </Card>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "info" }) {
  const color = {
    neutral: "bg-zinc-100/80 text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800",
    good: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-500/10",
    warn: "bg-amber-500/10 text-amber-900 dark:text-amber-400 border-amber-500/20 dark:border-amber-500/10",
    bad: "bg-rose-500/10 text-rose-800 dark:text-rose-400 border-rose-500/20 dark:border-rose-500/10",
    info: "bg-sky-500/10 text-sky-850 dark:text-sky-400 border-sky-500/20 dark:border-sky-500/10",
  }[tone];
  return <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border", color)}>{children}</span>;
}

export function SourceStamp({ source }: { source: SourceMetadata }) {
  return (
    <dl className="grid gap-2 rounded bg-zinc-50 dark:bg-zinc-800/50 p-3 text-xs text-zinc-600 dark:text-zinc-400 sm:grid-cols-3">
      <div>
        <dt className="font-semibold text-zinc-800 dark:text-zinc-200">Fonte</dt>
        <dd>{source.sourceSystem}</dd>
      </div>
      <div>
        <dt className="font-semibold text-zinc-800 dark:text-zinc-200">Registro</dt>
        <dd>{source.sourceRecordId}</dd>
      </div>
      <div>
        <dt className="font-semibold text-zinc-800 dark:text-zinc-200">Confiança</dt>
        <dd>{Math.round(source.confidence * 100)}%</dd>
      </div>
      <div>
        <dt className="font-semibold text-zinc-800 dark:text-zinc-200">Ocorrência</dt>
        <dd>{formatDateTime(source.occurredAt)}</dd>
      </div>
      <div>
        <dt className="font-semibold text-zinc-800 dark:text-zinc-200">Registro MCL</dt>
        <dd>{formatDateTime(source.recordedAt)}</dd>
      </div>
      <div>
        <dt className="font-semibold text-zinc-800 dark:text-zinc-200">Natureza</dt>
        <dd>{source.dataNature}</dd>
      </div>
    </dl>
  );
}

export function Timeline({ events }: { events: LogisticsEvent[] }) {
  return (
    <ol className="space-y-3">
      {events.map((event) => (
        <li key={event.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">{event.eventType.replaceAll("_", " ")}</p>
              <p className="text-sm text-zinc-550 dark:text-zinc-400">{event.persistentCode}</p>
            </div>
            <Badge tone={event.dataNature === "divergente" ? "bad" : "info"}>{event.dataNature}</Badge>
          </div>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            {formatDateTime(event.occurredAt)} - fonte {event.sourceSystem}, confiança {Math.round(event.confidence * 100)}%
          </p>
          {event.condition ? <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Condição: {event.condition}</p> : null}
        </li>
      ))}
    </ol>
  );
}

export function InlineLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-emerald-800 dark:text-emerald-500 underline-offset-4 hover:underline">
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
