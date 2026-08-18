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
    <main className="h-screen w-screen overflow-hidden bg-[#edf2f7] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans">
      <AssistenteIaClient userRole={profile?.role} userUnit={profile?.organization} />
    </main>
  );
}
