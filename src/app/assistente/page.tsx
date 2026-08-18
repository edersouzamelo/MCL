import { getUserProfile } from "@/app/actions/onboarding";
import { redirect } from "next/navigation";
import { AssistenteIaClient } from "@/components/AssistenteIaClient";

export const dynamic = "force-dynamic";

export default async function AssistenteIaPage() {
  const profile = await getUserProfile();

  if (profile && !profile.termsAcceptedAt) {
    redirect("/primeiro-acesso");
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-gradient-to-br from-[#ebf4fa] via-[#edf3f8] to-[#f4f7fa] dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans">
      <AssistenteIaClient userRole={profile?.role} userUnit={profile?.organization} />
    </main>
  );
}
