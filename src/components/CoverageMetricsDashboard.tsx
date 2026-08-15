"use client";

import { BarChart3, ShieldCheck, DollarSign, Award, Layers } from "lucide-react";

export type MetricCardProps = {
  title: string;
  value: string | number;
  subtitle: string;
  icon: any;
  trend?: string;
  colorClass: string;
};

export function MetricCard({ title, value, subtitle, icon: Icon, trend, colorClass }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-lg ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">{value}</span>
        {trend && <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{trend}</span>}
      </div>
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{subtitle}</p>
    </div>
  );
}

export function CoverageMetricsDashboard() {
  const supplyClasses = [
    { name: "Classe II (Fardamento & Calçado)", covered: 92, total: 100, count: 12, value: "R$ 480.000" },
    { name: "Classe I (Subsistência)", covered: 85, total: 100, count: 8, value: "R$ 320.000" },
    { name: "Classe IX (Suprimento de Aviação/Vtr)", covered: 70, total: 100, count: 5, value: "R$ 850.000" },
    { name: "Classe V (Armamento & Munição)", covered: 95, total: 100, count: 14, value: "R$ 1.200.000" },
  ];

  return (
    <div className="space-y-6">
      {/* Cards Principais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Taxa de Cobertura"
          value="88.5%"
          subtitle="Atendimento do déficit logístico via ARPs"
          icon={ShieldCheck}
          trend="+12.4% este mês"
          colorClass="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
        />
        <MetricCard
          title="Economia Gerada"
          value="R$ 142.500"
          subtitle="Diferencial R$ Menor Oferta vs Média"
          icon={DollarSign}
          trend="Economia real 14%"
          colorClass="bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400"
        />
        <MetricCard
          title="Atas de UASG Própria"
          value="65%"
          subtitle="1ª Prioridade Institucional (UASG 160136)"
          icon={Award}
          trend="Máxima prioridade"
          colorClass="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400"
        />
        <MetricCard
          title="Itens Mapeados CATMAT"
          value="39 / 44"
          subtitle="Grau de confiança sintética de 98%"
          icon={Layers}
          trend="Homologados"
          colorClass="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
        />
      </div>

      {/* Gráfico de Barras por Classe de Suprimento */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-600" />
              Taxa de Atendimento por Classe de Suprimento
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Percentual do déficit logístico coberto por Atas de Registro de Preço vigentes no Compras.gov.br
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-full border border-emerald-300 dark:border-emerald-800">
            Atualizado Hoje
          </span>
        </div>

        <div className="mt-6 space-y-5">
          {supplyClasses.map((item) => (
            <div key={item.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200">
                <span>{item.name} ({item.count} necessidades)</span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400">{item.covered}% ({item.value})</span>
              </div>
              <div className="h-3 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-500"
                  style={{ width: `${item.covered}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
