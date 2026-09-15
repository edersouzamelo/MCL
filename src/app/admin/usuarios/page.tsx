import React from "react";
import { AppShell } from "@/components/AppShell";
import { getAdminAccessMetrics } from "@/app/actions/admin";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/modules/auth/options";
import { MCL_ADMIN_EMAIL } from "@/modules/auth/access";
import { Activity, Clock3, LogIn, ShieldCheck, Users } from "lucide-react";
import { CleanFakesButton } from "@/components/CleanFakesButton";

function formatDateTime(value: string | null) {
  if (!value) return "Sem acesso registrado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Campo_Grande",
  }).format(new Date(value));
}

export default async function AdminUsuariosPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || session.user.email.toLowerCase() !== MCL_ADMIN_EMAIL) {
    redirect("/inicio");
  }

  const metrics = await getAdminAccessMetrics();

  const cards = [
    { label: "Usuários externos", value: metrics.totalUsers, icon: Users },
    { label: "Visitantes do Congresso", value: metrics.congressVisitors, icon: ShieldCheck },
    { label: "Entradas autenticadas", value: metrics.totalAuthenticatedEntries, icon: LogIn },
    { label: "Entradas hoje", value: metrics.authenticatedEntriesToday, icon: Activity },
  ];

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" /> Administração restrita
            </div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              <Users className="h-6 w-6 text-emerald-600" />
              Monitor de acessos
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
              Visão administrativa de usuários, cadastros e entradas autenticadas no MCL. O acesso do administrador é separado das métricas externas.
            </p>
          </div>
          <CleanFakesButton />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">{card.label}</span>
                  <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="mt-3 text-3xl font-bold tabular-nums text-gray-950 dark:text-white">{card.value}</div>
              </div>
            );
          })}
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-gray-200 px-5 py-4 dark:border-zinc-800">
            <h2 className="font-semibold text-gray-950 dark:text-white">Usuários e frequência de acesso</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
              Frequência = quantidade de logins autenticados registrados pelo MCL a partir desta implantação.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800">
              <thead className="bg-gray-50 dark:bg-zinc-950/50">
                <tr>
                  {['Usuário', 'Perfil / OM', 'Frequência', 'Último acesso', 'Acessos recentes'].map((label) => (
                    <th key={label} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
                {metrics.users.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                    <td className="px-5 py-4">
                      <div className="flex min-w-[240px] items-center gap-3">
                        {user.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img className="h-10 w-10 rounded-full object-cover" src={user.image} alt="" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            {user.name.charAt(0) || "U"}
                          </div>
                        )}
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-gray-950 dark:text-white">{user.name}</span>
                            {user.isAdmin ? <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">ADMIN</span> : null}
                            {user.isVisitor ? <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">VISITANTE</span> : null}
                          </div>
                          <div className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-600 dark:text-zinc-300">
                      <div className="max-w-[280px]">{user.militaryRole || "Cadastro ainda não concluído"}</div>
                      {user.militaryOrganization ? <div className="mt-1 text-gray-500 dark:text-zinc-500">{user.militaryOrganization}</div> : null}
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-2xl font-bold tabular-nums text-gray-950 dark:text-white">{user.accessCount}</div>
                      <div className="text-[11px] text-gray-500 dark:text-zinc-500">logins registrados</div>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-600 dark:text-zinc-300">
                      <div className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-emerald-600" />{formatDateTime(user.lastAccessAt)}</div>
                      {user.firstAccessAt ? <div className="mt-1 text-[11px] text-gray-500 dark:text-zinc-500">Primeiro: {formatDateTime(user.firstAccessAt)}</div> : null}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-600 dark:text-zinc-300">
                      <div className="min-w-[180px] space-y-1">
                        {user.recentAccesses.length ? user.recentAccesses.map((value) => <div key={value}>{formatDateTime(value)}</div>) : <span className="text-gray-400">Nenhum login persistido</span>}
                      </div>
                    </td>
                  </tr>
                ))}
                {metrics.users.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-500">Nenhum usuário cadastrado.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
