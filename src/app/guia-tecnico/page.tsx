import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Badge, Card, PageHeader } from "@/components/ui";
import { LOGISTICS_STAGES } from "@/modules/logistics/stages";
import { COMPLEMENTARY_MODULES, SUPPLEMENTARY_MODULES, type SupportingModuleDefinition } from "@/modules/system/module-registry";

function ModuleList({ modules }: { modules: readonly SupportingModuleDefinition[] }) {
  return (
    <ul className="mt-4 space-y-2">
      {modules.map((module) => (
        <li className="flex items-start justify-between gap-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800" key={module.id}>
          <div>
            <Link className="font-semibold text-zinc-900 hover:text-sky-700 dark:text-zinc-100 dark:hover:text-sky-400" href={module.href}>{module.title}</Link>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{module.description}</p>
          </div>
          <Badge tone={module.maturity === "Operacional" ? "good" : module.maturity === "Parcial" ? "warn" : "neutral"}>{module.maturity}</Badge>
        </li>
      ))}
    </ul>
  );
}

export default function TechnicalGuidePage() {
  return (
    <AppShell>
      <PageHeader
        title="Guia técnico e expansão"
        description="Mapa de responsabilidade para evoluir o MCL sem confundir o fluxo logístico principal com capacidades transversais ou extensões opcionais."
      />

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="border-t-4 border-t-sky-500">
          <span className="text-xs font-bold uppercase tracking-widest text-sky-700 dark:text-sky-400">Nível 01 · principal</span>
          <h2 className="mt-2 text-lg font-bold text-zinc-950 dark:text-zinc-50">Cadeia logística</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">As oito etapas que organizam a trajetória operacional de ponta a ponta.</p>
          <ol className="mt-4 grid grid-cols-2 gap-2">
            {LOGISTICS_STAGES.map((stage) => (
              <li key={stage.id}><Link className="block rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-800 hover:border-sky-400 dark:border-zinc-800 dark:text-zinc-200" href={stage.href}>{stage.number} · {stage.title}</Link></li>
            ))}
          </ol>
          <section aria-labelledby="entenda-mcl-title" className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-950/20">
            <h3 id="entenda-mcl-title" className="text-lg font-bold text-zinc-950 dark:text-zinc-50">Entenda o MCL</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Apresentação do Modelo de Continuidade Logística em Salvador, em 13 SET 26.</p>
            <a className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:bg-sky-600 dark:hover:bg-sky-500" href="/downloads/mcl-salvador-13-set-26-final.pptx" download="MCL Salvador - 13 SET 26 final.pptx">Baixar apresentação (PPTX)</a>
          </section>
        </Card>

        <Card className="border-t-4 border-t-emerald-500">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Nível 02 · complementar</span>
          <h2 className="mt-2 text-lg font-bold text-zinc-950 dark:text-zinc-50">Suporte transversal</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Governança e infraestrutura necessárias para sustentar todas as etapas.</p>
          <ModuleList modules={COMPLEMENTARY_MODULES} />
        </Card>

        <Card className="border-t-4 border-t-violet-500">
          <span className="text-xs font-bold uppercase tracking-widest text-violet-700 dark:text-violet-400">Nível 03 · suplementar</span>
          <h2 className="mt-2 text-lg font-bold text-zinc-950 dark:text-zinc-50">Ampliação do núcleo</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Capacidades adicionais que enriquecem o sistema sem se tornarem dependências do núcleo determinístico.</p>
          <ModuleList modules={SUPPLEMENTARY_MODULES} />
        </Card>
      </div>
    </AppShell>
  );
}
