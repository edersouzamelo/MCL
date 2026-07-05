"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const colors = ["#047857", "#0284c7", "#d97706", "#be123c", "#7c3aed", "#52525b", "#16a34a"];

export function DashboardCharts({
  unitsByState,
  coverage,
}: {
  unitsByState: Record<string, number>;
  coverage: Array<{ code: string; cobertura: number; entrega: number }>;
}) {
  const stateData = Object.entries(unitsByState).map(([name, value]) => ({ name, value }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="h-72 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <h2 className="mb-2 font-semibold">Estado das unidades logisticas</h2>
        <ResponsiveContainer width="100%" height="85%">
          <PieChart>
            <Pie data={stateData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
              {stateData.map((entry, index) => (
                <Cell key={entry.name} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="h-72 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <h2 className="mb-2 font-semibold">Cobertura e entrega por necessidade</h2>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={coverage}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="code" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="cobertura" fill="#047857" />
            <Bar dataKey="entrega" fill="#d97706" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
