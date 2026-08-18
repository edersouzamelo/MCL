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
    <main className="mcl-ai-route">
      <AssistenteIaClient userRole={profile?.role} userUnit={profile?.organization} />
    </main>
  );
}
