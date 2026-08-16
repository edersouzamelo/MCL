"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  ExpenseNatureBreakdown,
  ResourceSourceBreakdown,
  MonthlyExecutionPoint,
} from "@/modules/credits/types";

interface CreditDashboardChartsProps {
  byExpenseNature: ExpenseNatureBreakdown[];
  byResourceSource: ResourceSourceBreakdown[];
  monthlyExecution: MonthlyExecutionPoint[];
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"];

function formatCurrency(val: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(val);
}

export function CreditDashboardCharts({
  byExpenseNature,
  byResourceSource,
  monthlyExecution,
}: CreditDashboardChartsProps) {
  const expenseData = byExpenseNature.map((item) => ({
    name: item.code,
    label: item.label.split("-")[1]?.trim() || item.code,
    Dotação: item.totalUpdated,
    Empenhado: item.committed,
    Pago: item.paid,
    Disponível: item.available,
  }));

  const pieData = byResourceSource.map((item) => ({
    name: item.code === "0100" ? "0100 - Tesouro" : item.code === "0142" ? "0142 - Defesa" : `Fonte ${item.code}`,
    value: item.totalUpdated,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Chart 1: Execução por Natureza de Despesa (ND) */}
      <div className="lg:col-span-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm transition-colors">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1 flex items-center justify-between">
          <span>Execução Orçamentária por Natureza de Despesa (ND)</span>
          <span className="text-xs font-normal text-zinc-500">Valores em R$</span>
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
          Comparativo entre Dotação Atualizada, Empenho Emitido e Valor Pago.
        </p>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={expenseData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
              <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#71717a"
                fontSize={10}
                tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: any) => [formatCurrency(Number(value)), ""]}
                contentStyle={{
                  backgroundColor: "#18181b",
                  borderColor: "#27272a",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#f4f4f5",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
              <Bar dataKey="Dotação" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Empenhado" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Pago" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Distribuição por Fonte de Recursos (Donut) */}
      <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm transition-colors flex flex-col">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
          Distribuição por Fonte de Recursos
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
          Participação da Dotação Autorizada por Fonte.
        </p>

        <div className="h-64 w-full flex-1 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val: any) => [formatCurrency(Number(val)), "Dotação"]}
                contentStyle={{
                  backgroundColor: "#18181b",
                  borderColor: "#27272a",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#f4f4f5",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 3: Evolução Mensal da Execução Orçamentária (Linha / Área) */}
      <div className="lg:col-span-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm transition-colors">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1 flex items-center justify-between">
          <span>Evolução Mensal da Execução (SIAFI / Tesouro Gerencial)</span>
          <span className="text-xs font-normal text-zinc-500">Acumulado do Exercício</span>
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
          Ritmo de emissão de Notas de Empenho, Liquidações e Pagamentos efetuados.
        </p>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyExecution} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorEmp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorLiq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPago" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" stroke="#71717a" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#71717a"
                fontSize={10}
                tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: any) => [formatCurrency(Number(value)), ""]}
                contentStyle={{
                  backgroundColor: "#18181b",
                  borderColor: "#27272a",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#f4f4f5",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Area
                type="monotone"
                dataKey="empenhado"
                name="Empenhado"
                stroke="#f59e0b"
                fillOpacity={1}
                fill="url(#colorEmp)"
              />
              <Area
                type="monotone"
                dataKey="liquidado"
                name="Liquidado"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorLiq)"
              />
              <Area
                type="monotone"
                dataKey="pago"
                name="Pago"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorPago)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
